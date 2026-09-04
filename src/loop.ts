import { Assembler } from "./assembler.ts";
import type { Context, Message } from "./context.ts";
import { decide, type HookBag } from "./hooks.ts";
import type { Model, ModelShelf } from "./models.ts";
import { blockedAction } from "./policy.ts";
import type { Tool } from "./tools.ts";
import { CANCELLED, PHASE_IDLE, PHASE_REASON, PHASE_TOOL, STOPPED } from "./state.ts";

export interface LoopHost {
  id: string;
  context: Context;
  modelId: string | null;
  tools: Tool[];
  phase: number;
  state: number;
  hooks: HookBag;
  ac: AbortController;
  setPhase(p: number): void;
}

export async function oneStep(host: LoopHost, models: ModelShelf): Promise<{ text: string; stopped?: boolean }> {
  let modelId = host.modelId;
  const verdict = await decide(host.hooks.beforeReason, host.id, modelId);
  if (verdict === "deny") return { text: "", stopped: true };
  if (typeof verdict === "object" && verdict.redirect.model) modelId = verdict.redirect.model;

  if (!modelId) throw new Error("no model bound");
  const model: Model | undefined = models.get(modelId);
  if (!model) throw new Error("unknown model " + modelId);
  if (model.ready === false) throw new Error("model not ready: " + (model.reasonNotReady ?? modelId));

  host.setPhase(PHASE_REASON);
  const assembler = new Assembler();
  const onToken = host.hooks.onToken;
  const wrapped = onToken
    ? tokenTee(assembler, (c) => onToken(host.id, c))
    : assembler;

  const toolDesc = host.tools.map((t) => ({ name: t.name, description: t.description, schema: t.schema }));
  await model.reason({ messages: host.context.view(), tools: toolDesc }, wrapped, host.ac.signal);

  const out = assembler.end();
  host.hooks.afterReason?.(host.id, out.text);
  if (isClosed(host)) {
    host.setPhase(PHASE_IDLE);
    return { text: out.text, stopped: true };
  }

  if (out.toolCalls.length === 0) {
    if (out.text) host.context.append({ role: "assistant", content: out.text });
    host.setPhase(PHASE_IDLE);
    return { text: out.text };
  }

  host.setPhase(PHASE_TOOL);
  const frames: Message[] = [];
  const assistant: Message = { role: "assistant", content: out.text, toolCalls: out.toolCalls };
  for (let i = 0; i < out.toolCalls.length; i++) {
    if (isClosed(host)) {
      host.setPhase(PHASE_IDLE);
      return { text: out.text, stopped: true };
    }
    const tc = out.toolCalls[i]!;
    let name = tc.name;
    const tv = await decide(host.hooks.beforeTool, host.id, name, tc.arguments);
    if (isClosed(host)) {
      host.setPhase(PHASE_IDLE);
      return { text: out.text, stopped: true };
    }
    if (tv === "deny") {
      frames.push({ role: "tool", content: JSON.stringify({ error: "blocked_by_hook", reason: "denied" }), toolCallId: tc.id });
      continue;
    }
    if (typeof tv === "object" && tv.redirect.tool) name = tv.redirect.tool;

    const policy = blockedAction(name);
    if (policy) {
      frames.push({ role: "tool", content: JSON.stringify({ error: "blocked_by_policy", reason: policy }), toolCallId: tc.id });
      continue;
    }

    const tool = findTool(host.tools, name);
    const result = tool
      ? await tool.call(tc.arguments, host.ac.signal)
      : { error: "unknown_tool", reason: name };
    if (isClosed(host)) {
      host.setPhase(PHASE_IDLE);
      return { text: out.text, stopped: true };
    }
    host.hooks.afterTool?.(host.id, name, result);
    frames.push({ role: "tool", content: JSON.stringify(result), toolCallId: tc.id });
  }
  if (isClosed(host)) {
    host.setPhase(PHASE_IDLE);
    return { text: out.text, stopped: true };
  }
  host.context.append(assistant);
  host.context.appendMany(frames);
  host.setPhase(PHASE_IDLE);
  return { text: out.text };
}

function isClosed(host: LoopHost): boolean {
  return host.state === STOPPED || host.state === CANCELLED;
}

function findTool(tools: Tool[], name: string): Tool | undefined {
  for (let i = 0; i < tools.length; i++) if (tools[i]!.name === name) return tools[i];
  return undefined;
}

function tokenTee(inner: Assembler, onChunk: (c: string) => void): Assembler {
  const orig = inner.pushText.bind(inner);
  inner.pushText = (c: string) => {
    orig(c);
    if (c) onChunk(c);
  };
  return inner;
}

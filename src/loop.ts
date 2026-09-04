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
  host.context.append({ role: "assistant", content: out.text, toolCalls: out.toolCalls });
  try {
    for (let i = 0; i < out.toolCalls.length; i++) {
      const tc = out.toolCalls[i]!;
      if (isClosed(host)) {
        fillMissing(host, out.toolCalls, "stopped");
        return { text: out.text, stopped: true };
      }
      let name = tc.name;
      const tv = await decide(host.hooks.beforeTool, host.id, name, tc.arguments);
      if (isClosed(host)) {
        fillMissing(host, out.toolCalls, "stopped");
        return { text: out.text, stopped: true };
      }
      if (tv === "deny") {
        host.context.append({ role: "tool", content: JSON.stringify({ error: "blocked_by_hook", reason: "denied" }), toolCallId: tc.id });
        continue;
      }
      if (typeof tv === "object" && tv.redirect.tool) name = tv.redirect.tool;

      const policy = blockedAction(name);
      if (policy) {
        host.context.append({ role: "tool", content: JSON.stringify({ error: "blocked_by_policy", reason: policy }), toolCallId: tc.id });
        continue;
      }

      const tool = findTool(host.tools, name);
      const result = tool
        ? await tool.call(tc.arguments, host.ac.signal)
        : { error: "unknown_tool", reason: name };
      host.hooks.afterTool?.(host.id, name, result);
      host.context.append({ role: "tool", content: JSON.stringify(result), toolCallId: tc.id });
      if (isClosed(host)) {
        fillMissing(host, out.toolCalls, "stopped");
        return { text: out.text, stopped: true };
      }
    }
    return { text: out.text };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    fillMissing(host, out.toolCalls, reason);
    throw e;
  } finally {
    host.setPhase(PHASE_IDLE);
  }
}

function isClosed(host: LoopHost): boolean {
  return host.state === STOPPED || host.state === CANCELLED;
}

function fillMissing(host: LoopHost, calls: { id: string }[], reason: string): void {
  const have = new Set<string>();
  const view = host.context.view();
  for (let i = 0; i < view.length; i++) {
    const id = view[i]!.toolCallId;
    if (view[i]!.role === "tool" && id) have.add(id);
  }
  const body = JSON.stringify({ error: reason === "stopped" ? "stopped" : "tool_error", reason });
  for (let i = 0; i < calls.length; i++) {
    const id = calls[i]!.id;
    if (have.has(id)) continue;
    host.context.append({ role: "tool", content: body, toolCallId: id });
    have.add(id);
  }
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

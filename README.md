# webagent

A Bun harness for many agent runs at once. You drive the loop with public controls.
Products sit on top of intake + those controls — they do not plug providers into slots.

Requires [Bun](https://bun.sh) 1.1+.

```sh
bun src/cli.ts models
bun src/cli.ts ask hello
bun src/cli.ts serve          # :8787
```

```ts
import { Harness } from "webagent";

const h = new Harness();
const run = h.create();
run.useModel("echo").inject({ text: "hello" });
const { lastText } = await run.start();
```

A run with no model fails closed. `useModel` / `inject({ model })` / `fork({ model })` bind
for the **next** reason step, not mid-stream. `echo` is always registered and ready.
`openrouter` is listed too; it is ready only when `OPENROUTER_API_KEY` is set
(`OPENROUTER_MODEL` optional, default `openai/gpt-4o-mini`).

## Layers

1. **Intake** — accept many requests. No reasoning.
2. **Scheduler** — many runs in parallel; I/O-bound; cap in-flight work (default 1024).
3. **Loop** — perceive → reason → act → observe. One stream assembler per step.
   Tool-call JSON is parsed once at block end, never mid-token.
4. **Controls** — verbs on a **run**.
5. **Policy** — deterministic, fail-closed, around tools. The model cannot bypass it.
6. **Extensions** — register models and tools. Compose; do not replace the loop.
7. **Apps** — bakery, support, and the rest use intake + controls.

## Controls

| Verb | What it does |
| --- | --- |
| `create` | New run. Unbound until you pick a model. |
| `inject` | Add user text, messages, a model, or pinned vars. |
| `useModel` / `clearModel` / `getModelBinding` | Bind, unbind, or read the model. |
| `useTool` / `removeTool` / `listTools` | Attach tools to this run. |
| `start` / `resume` | Run until a reply, pause, or cancel. |
| `startAll` | Start many runs; scheduler-capped. |
| `stepOnce` / `retryStep` / `skipStep` | One cycle, or skip the counter. |
| `pause` | Finish the current step, then freeze. |
| `cancel` | Abort in-flight I/O. |
| `stop` | End the run. |
| `fork` | Child shares the message spine until either side writes. |
| `merge` | Absorb the source into the target and **stop** the source. |
| `explain` / `getContext` / `wait` / `eventStream` | Inspect. Event log is capped at 32. |

```ts
const parent = h.create({ model: "echo" });
parent.inject({ text: "shared" });
await parent.start();

const child = h.fork(parent.id, { model: "echo" });
child.inject({ text: "child-only" });
await child.start();
// parent context does not contain "child-only"
```

## Models and tools

Register as many as you want. Choosing one is a control, not a spec field.

```ts
h.addModel({
  id: "other",
  ready: true,
  async reason(_req, out) {
    out.pushText("from-other");
  },
});

h.addTool({
  name: "lookup",
  async call(args) {
    return { city: args.city };
  },
});

const run = h.create({ model: "other", tools: [/* or run.useTool later */] });
```

A model streams into an assembler (`pushText` / `pushToolDelta`). It must not parse
tool JSON itself.

`getAvailableModels()` includes models that are not ready (`ready: false` plus a reason).

## Policy and hooks

Names containing `delete_account`, `transfer_funds`, `wipe`, or `drop_database` never run.
Hooks can `allow`, `deny`, or `{ redirect: { model?, tool? } }`:

`beforeReason`, `afterReason`, `beforeTool`, `afterTool`, `onToken`,
`onPause`, `onStop`, `onFork`, `onMerge`, `onError`.

## HTTP

`bun src/cli.ts serve [addr]` (default `:8787`):

| | |
| --- | --- |
| `GET /models` | Registered models |
| `GET /health` | Inflight / run counts by state |
| `POST /runs` | `{ text, model }` → create, inject, start |
| `GET /runs/:id` | `explain()` |
| `POST /mcp` | Streamable HTTP MCP (`2025-06-18`) |

MCP exposes the same verbs (`create`, `inject`, `start`, `pause`, `fork`, `merge`, …).
`tools/call` only hits `Harness` / `Run`. Session id after `initialize`; JSON by default,
SSE when `Accept` is `text/event-stream`.

## Layout

```
src/     harness (flat)
test/    harness, MCP, perf
```

```sh
bun test
bun run typecheck
```

Apache-2.0. See [LICENSE](LICENSE).

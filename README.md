# webagent

A layered harness: intake → scheduler → loop → controls → policy → extensions.

No slots. Many runs in parallel. You pick the model (`useModel` / `getAvailableModels`).
Unbound runs fail closed. Mid-run `useModel` takes effect at the next reason step.

The same verbs are on Streamable HTTP MCP at `POST /mcp` (`2025-06-18`, session id, JSON + SSE).

## Layout

```
src/     harness
test/    harness, MCP, perf
```

## CLI

```sh
bun src/cli.ts models
bun src/cli.ts ask hello
bun src/cli.ts serve          # :8787  POST /runs  GET /models  GET /health  POST /mcp
```

## Controls

`create`, `start`, `pause`, `resume`, `stop`, `cancel`, `stepOnce`, `fork`, `merge`, `inject`, `useModel`.

Pause finishes the current step, then freezes. Cancel aborts in-flight I/O. Merge absorbs a source run and stops it.

## Tests

```sh
bun test
bun run typecheck
```

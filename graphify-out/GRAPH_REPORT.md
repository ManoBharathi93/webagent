# Graph Report - workspace  (2026-09-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 190 nodes · 400 edges · 10 communities (8 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d68ab37`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9

## God Nodes (most connected - your core abstractions)
1. `Run` - 37 edges
2. `Harness` - 22 edges
3. `Context` - 17 edges
4. `Tool` - 14 edges
5. `oneStep()` - 12 edges
6. `Assembler` - 11 edges
7. `Scheduler` - 10 edges
8. `ModelShelf` - 10 edges
9. `intake()` - 10 edges
10. `compilerOptions` - 10 edges

## Surprising Connections (you probably didn't know these)
- `ToolDef` --references--> `Harness`  [EXTRACTED]
  src/mcp.ts → src/harness.ts
- `CreateOpts` --references--> `Context`  [EXTRACTED]
  src/run.ts → src/context.ts
- `CreateOpts` --references--> `Message`  [EXTRACTED]
  src/run.ts → src/context.ts
- `CreateOpts` --references--> `HookBag`  [EXTRACTED]
  src/run.ts → src/hooks.ts
- `CreateOpts` --references--> `Tool`  [EXTRACTED]
  src/run.ts → src/tools.ts

## Import Cycles
- None detected.

## Communities (10 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (13): args, h, defaultHarness(), Harness, nextId(), intake(), echoModel(), Model (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (23): decide(), HookBag, Verdict, findTool(), LoopHost, oneStep(), tokenTee(), blockedAction() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (3): Message, ModelRequest, Run

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (16): BY_NAME, dispatch(), ID, mcp(), MCP_PROTOCOL, must(), Rpc, RpcErr (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (18): bin, webagent, description, devDependencies, @types/bun, typescript, engines, bun (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (14): bun-types, src/**/*.ts, test/**/*.ts, compilerOptions, allowImportingTsExtensions, module, moduleResolution, noEmit (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (6): Assembled, Assembler, EMPTY, parseOnce(), Slot, ToolCall

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (3): info(), ModelShelf, guardTool()

## Knowledge Gaps
- **37 isolated node(s):** `Phase`, `RpcErr`, `Rpc`, `Assembled`, `Slot` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 65 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Run` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Why does `Context` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 7`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Harness` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `oneStep()` (e.g. with `.end()` and `.get()`) actually correct?**
  _`oneStep()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Phase`, `RpcErr`, `Rpc` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11092436974789915 - nodes in this community are weakly interconnected._
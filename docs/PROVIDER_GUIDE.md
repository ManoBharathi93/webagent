# Provider Author's Guide

This guide is for a company or contributor adding a **provider** to a `webagent` slot — a
memory backend, a guardrail engine, a model gateway, an action provider, a channel, an
observability exporter, etc. A provider is your code plugged into a stable interface; you
never fork the framework.

## 1. Pick the slot

Each pillar is a slot: an interface in [`core`](../core/core.go) plus a registry. The slots
and their interfaces:

| Slot | Package | Interface | Constructor registers into |
|------|---------|-----------|----------------------------|
| model | `brain` | `core.Brain` | `brain.Registry` |
| action | `action` | `action.Provider` (yields `core.Tool`) | `action.Registry` |
| retrieval | `retrieval` | `core.Retriever` | `retrieval.Registry` |
| memory | `memory` | `core.Memory` | `memory.Registry` |
| guardrail | `guardrail` | `core.Guardrail` | `guardrail.Registry` |
| channel | `channels` | `core.Channel` | `channels.Registry` |
| presenter | `present` | `core.Presenter` | `present.Registry` |
| observability | `observability` | `core.Observer` | `observability.Registry` |

## 2. Implement the interface

Write a type that satisfies the slot interface. Config from the spec arrives as an opaque
`map[string]any`; decode it into your own typed struct with `core.Decode`. **Never read secrets
from the spec** — take the *name* of an environment variable in config and read the secret from
the environment at runtime (see the `brain` gateway provider for the pattern).

```go
type myMemory struct{ /* client, config */ }

func (m *myMemory) Name() string { return "acme" }
func (m *myMemory) Remember(ctx context.Context, s core.Scope, items []core.MemoryItem) error { ... }
func (m *myMemory) Recall(ctx context.Context, s core.Scope, query string, k int) ([]core.MemoryItem, error) { ... }
```

Rules that matter:

- **Scope isolation is mandatory** for memory: never return one `Scope`'s data to another.
- **Respect `ctx`** for cancellation/deadlines on any network call.
- **Return errors** — do not log-and-swallow. The framework records step errors on the trace;
  guardrails that error are treated as **fail-closed** (deny), so surfacing the error is correct.
- Optional richer behavior goes through an **optional interface** (e.g. `core.ToolSchema`,
  `spi.Capable`), never by changing the required interface.

## 3. Register it

Register in an `init()` with a `spi.Descriptor` (the menu entry a business sees) and a
constructor. Mark `Partner: true` if you are a collaborating company.

```go
func init() {
    memory.Registry.Register(spi.Descriptor{
        Name:         "acme",
        Summary:      "Acme managed memory: durable, embeddings, cross-session recall",
        Partner:      true,
        Capabilities: spi.Capabilities{"embeddings": true, "cross_session": true},
    }, newAcme)
}
```

A business then selects you with `"memory": {"type": "acme", "config": {...}}` in its spec.

## 4. Pass the conformance kit

Your adapter is compatible only when it passes the relevant suite in
[`conformance`](../conformance/conformance.go). Call it from your test with a live (or
faithfully mocked) instance:

```go
func TestAcmeConformance(t *testing.T) {
    m, err := memory.Registry.Get("acme", testConfig)
    if err != nil { t.Fatal(err) }
    conformance.Memory(t, m) // enforces round-trip + scope isolation
}
```

Green conformance is the bar for merge, and for being marked a default.

## 5. Compatibility

Follow [COMPATIBILITY.md](../COMPATIBILITY.md). The framework will not break the interface you
build against within a major version; in return, build against the required interface plus
optional interfaces only — do not depend on unexported behavior.

## Checklist

- [ ] Implements the slot interface; `Name()` is stable and unique.
- [ ] Config decoded via `core.Decode`; secrets read from env, never from the spec.
- [ ] Honors `ctx`; returns errors instead of swallowing them.
- [ ] Registers with a clear `Descriptor` (and `Partner: true` if applicable).
- [ ] Passes the slot's conformance suite in tests.
- [ ] `gofmt`, `go vet`, and `golangci-lint` clean.

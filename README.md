# webagent

An **AgentNet** project: a framework any business uses to stand up a production-grade
web/business agent from a **declarative spec** — pick a provider for each slot from a menu,
get a running agent. See [DESIGN.md](DESIGN.md) for the full architecture and roadmap.

## The model: slots, providers, picks

An agent is one **Brain** (LLM + instruction) over a set of pluggable **slots**, defined in
[`core/`](core/core.go). Each slot is a Service Provider Interface with a registry of
providers ([`spi/`](spi/spi.go)) and a default. A business's spec picks one provider per slot;
partner companies and businesses add providers by registering against the same interfaces —
nobody forks the core.

| Slot | Interface | Built-in providers | Default |
|------|-----------|--------------------|---------|
| Retrieval | `Retriever` | live, keyword, hybrid | live |
| Memory | `Memory` | session (+ partner adapters) | session |
| Guardrail | `Guardrail` | basic, off (+ partner adapters) | basic |
| Channel | `Channel` | a2a, web, whatsapp, telegram, slack | a2a |
| Presenter | `Presenter` | text, terminal (QR), web | text |
| Model | `Brain` | echo, openrouter, gateway (any OpenAI-compatible) | echo |
| Action | `Provider` / `Tool` | none, demo (MCP/browser providers to come) | none |
| Observability | `Observer` | none, log, memory (OTel exporter to come) | none |

Every tool the agent holds — from the action provider or injected by the host — is wrapped by
`action.Guard`, which runs the chosen guardrail on the action **before** it executes. The model
cannot bypass it: action safety is code-enforced, not prompt-enforced.

Three audiences, one contract: businesses that **configure** (pick from the menu), businesses
that **extend** (register a custom provider), and partner companies that **provide** (ship an
adapter, some as defaults). The SPI is the stable, versioned contract all three depend on.

## Two example businesses, zero shared code

- [`examples/zomato.json`](examples/zomato.json) — food delivery: `live` retrieval, `a2a` +
  `whatsapp`.
- [`examples/bakery.json`](examples/bakery.json) — a bakery: `keyword` retrieval over its own
  catalog, `web` + `slack`.

## CLI

```
webagent options            # the menu a business picks from (* = default)
webagent validate <spec>    # load a spec and resolve every chosen provider
webagent serve <spec>       # build the agent and run its channels
```

The CLI runs with a model-free `Echo` brain and no live tools, so the template is
demonstrable without credentials. Production injects the ADK/Gemini brain (or any model via
the model adapter) and the MCP toolset.

## Provider conformance

Every provider — built-in or partner — must pass its slot's conformance suite
([`conformance/`](conformance/conformance.go)) to be certified (and to qualify as a default).
The built-in providers pass it in their own tests.

## Status

Complete and green (build/vet/test):

- **Phase 1 — SPI foundation:** slots, capability-aware registry (default/override), Memory +
  Guardrail partner slots, conformance kit, spec v1, two example businesses.
- **Phase 2 — model-agnostic brain:** `openrouter`/`gateway` OpenAI-compatible providers with a
  tool-calling loop; `echo` default.
- **Phase 3 — action layer:** pluggable action-provider slot, and every tool call routed through
  the guardrail before it executes (deterministic, code-enforced safety).
- **Phase 4 — observability + eval:** per-turn `TurnTrace` (OTel GenAI-aligned) to a pluggable
  observer (none/log/memory), and an [`eval/`](eval/eval.go) harness (scenarios + checks).

Remaining (see [DESIGN.md](DESIGN.md)): concrete MCP/browser action providers, an OpenTelemetry
exporter, partner adapters (memory/guardrail), multi-tenant identity/billing.

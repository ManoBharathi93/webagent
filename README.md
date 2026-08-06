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
| Brain / Action | `Brain` / `Tool` | injected (ADK + MCP in production) | — |

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
web-agent options            # the menu a business picks from (* = default)
web-agent validate <spec>    # load a spec and resolve every chosen provider
web-agent serve <spec>       # build the agent and run its channels
```

The CLI runs with a model-free `Echo` brain and no live tools, so the template is
demonstrable without credentials. Production injects the ADK/Gemini brain (or any model via
the model adapter) and the MCP toolset.

## Provider conformance

Every provider — built-in or partner — must pass its slot's conformance suite
([`conformance/`](conformance/conformance.go)) to be certified (and to qualify as a default).
The built-in providers pass it in their own tests.

## Status

Phase 1 (SPI foundation) complete: slots, capability-aware registry (default/override),
Memory + Guardrail partner slots, conformance kit, spec v1, two example businesses. Builds,
vets, and tests clean. Next phases (model-agnostic brain, action layer, observability/eval,
partner adapters) are in [DESIGN.md](DESIGN.md).

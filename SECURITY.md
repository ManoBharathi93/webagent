# Security Policy

## Reporting a vulnerability

Please report security issues privately. Do **not** open a public issue for a vulnerability.

- Use GitHub's **private vulnerability reporting** ("Report a vulnerability" on the Security
  tab), or
- email the maintainers at the address listed in the repository's organization profile.

Include a description, affected version/commit, and reproduction steps. We aim to acknowledge
within a few business days and to coordinate a fix and disclosure timeline with you.

## Scope and design notes

Security-relevant properties of the framework that reviewers should know:

- **Guardrails fail closed.** If a guardrail's `Inspect` returns an error, the framework denies
  (blocks input, withholds output, refuses the action) rather than proceeding. See
  [`core`](core/core.go) and [`action`](action/action.go).
- **Action safety is code-enforced.** Every tool call is routed through the guardrail *before*
  execution by `action.Guard`; the model cannot bypass it.
- **Secrets are never read from a spec.** Providers take the *name* of an environment variable
  in config and read the secret from the environment at runtime.
- **Traces may contain user content.** `core.TurnTrace` carries input/output text. Observers
  that export traces are responsible for redaction/retention appropriate to their environment;
  the built-in `log` observer does not emit input/output text.

## Supply chain

CI runs `govulncheck` on every push and pull request. Dependencies are pinned via `go.sum`.

## Known deferred hardening

Tracked in [DESIGN.md](DESIGN.md) "Open decisions": per-slot fallback/circuit-breaker,
PII/secret redaction in traces and memory, idempotency keys for side-effecting tools, rate
limits / cost caps, and the multi-tenant credential vault.

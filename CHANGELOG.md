# Changelog

All notable changes are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project follows
[Semantic Versioning](https://semver.org). See [COMPATIBILITY.md](COMPATIBILITY.md).

## [Unreleased]

## [0.1.0] - 2026-08-07

### Added

- SPI foundation: capability-aware provider registry with default/override resolution, and
  slots for model, action, retrieval, memory, guardrail, channel, presenter, and observability.
- Model-agnostic brain: `openrouter` and `gateway` OpenAI-compatible providers with a
  tool-calling loop; `echo` default.
- Pluggable action-provider slot; every tool call is routed through the guardrail before it
  executes (deterministic, code-enforced safety).
- Per-turn observability (`TurnTrace`, OpenTelemetry GenAI-aligned) with `none`/`log`/`memory`
  observers, and an evaluation harness (`eval`).
- Conformance kit for certifying providers; two example businesses (Zomato, a bakery).
- `build.Build` functional options (`WithTools`, `WithLogger`); injected `*slog.Logger` seam.
- Project hygiene: Apache-2.0 license, CI (fmt/vet/race/coverage/govulncheck/golangci-lint),
  and a compatibility policy.

### Security

- Guardrails fail **closed** on error: input is blocked, output is withheld, and actions are
  refused if the guardrail itself errors.

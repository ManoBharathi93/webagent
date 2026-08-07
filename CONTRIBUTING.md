# Contributing to webagent

Thanks for contributing. This is an AgentNet project developed together with partner
companies, so we keep the bar high and the process predictable.

## Development

Requirements: Go 1.23+.

```sh
make fmt      # gofmt -w
make vet      # go vet
make lint     # golangci-lint run
make test     # go test ./...
make race     # go test -race ./...
make cover    # coverage
make ci       # what CI enforces (fmt-check, vet, race, cover)
```

Before opening a PR, `make ci` and `make lint` must be clean.

## Adding a provider

If you are plugging a backend into a slot (memory, guardrail, model, etc.), read
[docs/PROVIDER_GUIDE.md](docs/PROVIDER_GUIDE.md). Your adapter must pass the relevant
[`conformance`](conformance/conformance.go) suite.

## Coding standards

- Follow the [Uber Go Style Guide](https://github.com/uber-go/guide) and
  [Effective Go](https://go.dev/doc/effective_go).
- **Handle each error once** — do not log and return the same error.
- **Libraries do not log to stderr.** Use the injected `*slog.Logger` seam; default to silence.
- **Do not panic** in library code except for programmer errors at initialization (e.g. a
  duplicate registry registration).
- Keep the public API stable per [COMPATIBILITY.md](COMPATIBILITY.md): add, don't change.
- New behavior on an interface goes through a new optional interface, never by widening a
  required one.
- Every exported symbol has a doc comment; new features come with tests.

## Commits & PRs

- Small, focused commits with imperative subject lines ("Add X", "Fix Y").
- PRs describe the change and its rationale, and note any user-visible or API change.
- CI must be green.

## Licensing

By contributing you agree your contributions are licensed under the project's
[Apache-2.0 license](LICENSE).

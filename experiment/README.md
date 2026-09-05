# Pair experiment

Two public agents. One crawled site. One network report.

A founder who must hand a CEO a live seller: [HANDOFF.md](HANDOFF.md). Wire note for that CEO: [customer-prompt.md](customer-prompt.md).

```sh
bun src/cli.ts pair https://www.corgi.insure --keep --turns 0
```

| Agent | Role | Port (CLI default) |
| --- | --- | --- |
| Seller | Sales pack (`attachSales`): `map_risks` + pinpoint report | 8787 via `webagent pair` (0 in tests) |
| Buyer | Optional canned turns. Skip with `--turns 0`. | 8788 |

`auto` picks cursor, then openrouter, then script. Default OpenRouter model is `openai/gpt-4o-mini`.

Flags: `--site` `--max-pages` `--seller-port` `--buyer-port` `--model auto|cursor|openrouter|script` `--turns N` `--out` `--keep`.

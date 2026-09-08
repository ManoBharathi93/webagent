# Pair experiment

Two public agents. One crawled site. One network report.

Buyer and seller are **separate harnesses**. Each binds a live LLM when one is ready.

Story of the first thread: [CONVERSATION.md](../CONVERSATION.md). Live Corgi numbers: [corgi-analysis.md](corgi-analysis.md).

```sh
bun experiment/run.ts --site https://www.corgi.insure --model live
```

| Agent | Role | Port (CLI default) |
| --- | --- | --- |
| Seller | Sales pack (`attachSales`): `map_risks` + pinpoint report | 8787 via `webagent pair` (0 in tests) |
| Buyer | Founder. Tool `ask_peer` → seller `/chat` as a machine | 8788 |

| `--model` | Bind |
| --- | --- |
| `live` | First ready of `cursor`, `openrouter`, `ollama`. Throw if none. |
| `auto` | Same order, then `script` (CI). |
| `cursor` / `openrouter` / `ollama` | That id. Fail closed if it is not ready. |
| `script` | Deterministic tool relay. No LLM. |

Flags: `--site` `--max-pages` `--seller-port` `--buyer-port` `--model` `--out` `--keep`.

# Corgi pair — live LLM report

Site: https://www.corgi.insure  
Run: 2026-09-08T00:43:37Z  
Branch: `cursor/live-pair-llms-e5be`  
Model: **ollama** `qwen2.5:7b` on both hosts (no Cursor key, no OpenRouter key)

This is not the script relay. Each reason step is a real chat completion. Buyer and seller are separate harnesses.

```
human ──POST /chat──► buyer (ollama)
                         │ ask_peer × 3
                         ▼
                      seller (ollama) ── compose from sales instruction + pack pins
```

## What ran

| Agent | Role | Bind | Model |
| --- | --- | --- | --- |
| Seller | Corgi sales run (`attachSales`) | `r1` | `ollama` / qwen2.5:7b |
| Buyer | Founder. `ask_peer` → seller `/chat` as a machine | `r2` | `ollama` / qwen2.5:7b |

| Metric | Value |
| --- | --- |
| Pages | 40 (cap) |
| Crawl hops | 44, all HTTP 200 |
| Crawl time | 2.5 s |
| Agent hops | 15 (2 human, 13 machine) |
| Peer calls | **3** (one per founder turn) |
| Live model calls | 9 |
| Turn wall time | 51 s, 37 s, 49 s |
| `sellerMayInventPrice` | true (`$1 million` is not on the crawled price tokens) |

Ready probes: cursor missing `CURSOR_API_KEY`, openrouter missing `OPENROUTER_API_KEY`, ollama `/api/tags` ok.

## The three turns (composed, not relayed snippets)

**Turn 1 — “seed-stage SaaS… coverage… cost?”**  
Seller wrote a pinpoint report: SaaS / seed-stage, cyber and product risk, CGL, link to the site. It named **Stripe** (not in the pack; `map_risks` would have named Intryc). It stated a **$1 million** limit (not a site premium).  
Buyer called `ask_peer`, then summarized the peer for the founder.

**Turn 2 — “How fast vs a broker?”**  
Buyer called `ask_peer` again. Seller kept the same report bones and pointed at `/quote`. Buyer said an online quote is faster than a broker.

**Turn 3 — “Corgi or a traditional broker?”**  
Buyer called `ask_peer` a third time. Seller compared speed and ease and kept the CGL offer. Buyer recommended Corgi for a quicker, tailored quote.

## Live model calls

| ms | Side (order) | What |
| --- | --- | --- |
| 8596 | buyer | `ask_peer` |
| 28413 | seller | pinpoint report |
| 13788 | buyer | founder answer |
| 5082 | buyer | `ask_peer` |
| 22327 | seller | report + quote speed |
| 9291 | buyer | founder answer |
| 6214 | buyer | `ask_peer` |
| 32390 | seller | Corgi vs broker |
| 10639 | buyer | recommendation |

## What a real LLM did that the script did not

- Buyer **composed** a founder answer. It did not prefix `Corgi agent said:` and dump snippets.
- Seller used the sales report shape from the GEPA instruction.
- Turn times are seconds, not 1–5 ms.
- The model also **drifted**: seller skipped `map_risks` / `site_lookup`, invented Stripe, and invented a $1M limit. The script never did that because it only relayed tool JSON.

`--model live` fails closed when no real LLM is ready. `--model auto` still falls back to `script` for CI.

## Replay

```sh
ollama pull qwen2.5:7b
bun experiment/run.ts --site https://www.corgi.insure --model ollama
# or, first ready of cursor / openrouter / ollama:
bun experiment/run.ts --site https://www.corgi.insure --model live
```

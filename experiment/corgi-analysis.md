# Corgi pair — live OpenAI report

Site: https://www.corgi.insure  
Latest run: 2026-09-08T01:35:30Z  
Branch: `cursor/live-pair-llms-e5be`

Two working OpenAI pairs on the same three founder turns. There is no script model.

```
human ──POST /chat──► buyer (openai)
                         │ ask_peer
                         ▼
                      seller (openai) ── map_risks ──► grounded Seed pack
```

## Latest — GPT-5.6 Luna

Model: **openai** `gpt-5.6-luna` on both hosts. Chat Completions needs `reasoning_effort=none` to use function tools.

| Agent | Role | Bind | Model |
| --- | --- | --- | --- |
| Seller | Corgi sales run (`attachSales`) | `r1` | `openai` / gpt-5.6-luna |
| Buyer | Founder. `ask_peer` → seller `/chat` as a machine | `r2` | `openai` / gpt-5.6-luna |

| Metric | Value |
| --- | --- |
| Pages | 40 (cap) |
| Crawl hops | 44 |
| Crawl time | 2.0 s |
| Agent hops | 15 (2 human, 13 machine) |
| Peer calls | 3 |
| Live model calls | 10 |
| Turn wall time | 6.5 s, 3.8 s, 3.6 s |

### The three turns

**Turn 1 — seed-stage SaaS, B2B analytics, coverage and cost**  
Seller called `map_risks`. Report named **Intryc**, Seed package (CGL, D&O, Tech E&O, Cyber), site cost band **$2,000–$4,000** / year for about **$1M** core limits.  
Buyer listed those lines, quoted the peer, and restated the cost band.

**Turn 2 — how fast vs a broker**  
Seller: quotes in minutes vs longer broker back-and-forth.  
Buyer quoted: “Corgi is built to provide startup quotes in minutes.”

**Turn 3 — Corgi or a traditional broker**  
Seller: start with Corgi; keep a broker if the risk is unusual or international.  
Buyer recommended Corgi first and quoted: “Get a Corgi quote first, then use your broker to compare terms—not just price.”

## Earlier — GPT-4o mini

Run: 2026-09-08T01:23:49Z. Same site, same turns, **openai** `gpt-4o-mini` on both hosts.

| Metric | gpt-4o-mini | gpt-5.6-luna |
| --- | --- | --- |
| Peer calls | 6 | 3 |
| Live model calls | 18 | 10 |
| Turn wall time | 5.3 s, 3.7 s, 5.8 s | 6.5 s, 3.8 s, 3.6 s |
| Seller tool | `map_risks` → Intryc, Seed pack, $2k–$4k | same |

Luna used one peer call per turn. Mini used extra reason steps on the same questions. Both stayed on pack names (Intryc, not an invented customer).

## What this proves

- Two public agents talked over HTTP with a real OpenAI model.
- Seller used `map_risks` and stayed on pack names (Intryc, not Shopify).
- Buyer composed a founder answer and quoted the peer.
- GPT-5.6 Luna works on Chat Completions when `reasoning_effort` is `none`.
- The pair fails closed without a live key. The key lives in `.env` and is not committed.

```sh
export OPENAI_API_KEY=…
export OPENAI_MODEL=gpt-5.6-luna
bun experiment/run.ts --site https://www.corgi.insure --model openai
```

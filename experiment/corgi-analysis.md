# Corgi pair — live OpenAI report

Site: https://www.corgi.insure  
Run: 2026-09-08T01:23:49Z  
Branch: `cursor/live-pair-llms-e5be`  
Model: **openai** `gpt-4o-mini` on both hosts

This is a real agent-to-agent dialogue. Each reason step is an OpenAI chat completion. Buyer and seller are separate harnesses. There is no script model.

```
human ──POST /chat──► buyer (openai gpt-4o-mini)
                         │ ask_peer × 6
                         ▼
                      seller (openai gpt-4o-mini) ── map_risks ──► grounded Seed pack
```

## What ran

| Agent | Role | Bind | Model |
| --- | --- | --- | --- |
| Seller | Corgi sales run (`attachSales`) | `r1` | `openai` / gpt-4o-mini |
| Buyer | Founder. `ask_peer` → seller `/chat` as a machine | `r2` | `openai` / gpt-4o-mini |

| Metric | Value |
| --- | --- |
| Pages | 40 (cap) |
| Crawl hops | 44 |
| Crawl time | 2.1 s |
| Agent hops | 21 (2 human, 19 machine) |
| Peer calls | 6 |
| Live model calls | 18 |
| Turn wall time | 5.3 s, 3.7 s, 5.8 s |

Ready probes: cursor missing key, openai ready, openrouter missing key, ollama up (not used).

## The three turns

**Turn 1 — seed-stage SaaS, B2B analytics, coverage and cost**  
Seller called `map_risks`. Report named **Intryc**, Seed package (CGL, D&O, Tech E&O, Cyber), site cost band **$2,000–$4,000** / year, link to corgi.insure.  
Buyer quoted the peer and restated E&O, cyber, D&O and the cost band.

**Turn 2 — how fast vs a broker**  
Seller: quote in minutes vs days or weeks for a broker. Link to `/startup-insurance`.  
Buyer quoted that line.

**Turn 3 — Corgi or a traditional broker**  
Seller repeated the Seed pack and recommended Corgi for speed and SaaS fit.  
Buyer recommended Corgi and quoted the peer.

## What this proves

- Two public agents talked over HTTP with a real OpenAI model.
- Seller used `map_risks` and stayed on pack names (Intryc, not Shopify).
- Buyer composed a founder answer and quoted the peer.
- The pair fails closed without a live key. The key lives in `.env` and is not committed.

```sh
export OPENAI_API_KEY=…
bun experiment/run.ts --site https://www.corgi.insure --model openai
```

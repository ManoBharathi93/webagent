# Conversation

This file is a readme of the cloud-agent threads on the Corgi pair.

Site under test: https://www.corgi.insure

## This thread — GPT-5.6 Luna pair

Ask: run the same pair with GPT-5.6 Luna.

What changed:

- Chat Completions for `gpt-5*` send `reasoning_effort=none` so function tools work.
- The pair report prints the OpenAI model name (`OPENAI_MODEL`).

What ran on 2026-09-08 with **openai / gpt-5.6-luna** on both hosts:

| | |
| --- | --- |
| Peer calls | 3 |
| Completions | 10 |
| Turn time | 6.5 s, 3.8 s, 3.6 s |
| Seller tool | `map_risks` → Intryc, Seed pack, $2k–$4k site band |

Buyer asked seller over HTTP. Seller wrote a pinpoint report. Buyer quoted the peer and recommended Corgi. Same grounded pack as gpt-4o-mini, fewer peer calls. Full transcript: [experiment/corgi-analysis.md](experiment/corgi-analysis.md).

```sh
export OPENAI_API_KEY=…
export OPENAI_MODEL=gpt-5.6-luna
bun experiment/run.ts --site https://www.corgi.insure --model openai
```

## Earlier — GPT-4o mini pair

Ask: use a real OpenAI key. No script model.

What changed:

- `openai` is a live model. Ready when `OPENAI_API_KEY` is set. Default `gpt-4o-mini`.
- `--model live` / `auto` pick cursor, then openai, then openrouter, then ollama. Fail closed if none is ready.
- There is no script model. The key stays in `.env` and is not committed.

What ran on 2026-09-08 with **openai / gpt-4o-mini** on both hosts:

| | |
| --- | --- |
| Peer calls | 6 |
| Completions | 18 |
| Turn time | 5.3 s, 3.7 s, 5.8 s |
| Seller tool | `map_risks` → Intryc, Seed pack, $2k–$4k site band |

## Earlier thread — pair harness

PR: https://github.com/TheAgent-net/webagent/pull/1  
Branch: `cursor/layered-cake-harness-a1aa`

That thread built two hosts, hop traces, and the pair driver. The pair now requires a live LLM.

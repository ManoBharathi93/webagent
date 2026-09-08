# Conversation

This file is a readme of the cloud-agent threads on the Corgi pair.

Site under test: https://www.corgi.insure

## This thread — real OpenAI pair

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

Buyer asked seller over HTTP. Seller wrote a pinpoint report. Buyer quoted the peer and recommended Corgi. Full transcript: [experiment/corgi-analysis.md](experiment/corgi-analysis.md).

```sh
export OPENAI_API_KEY=…
bun experiment/run.ts --site https://www.corgi.insure --model openai
```

## Earlier thread — pair harness

PR: https://github.com/TheAgent-net/webagent/pull/1  
Branch: `cursor/layered-cake-harness-a1aa`

That thread built two hosts, hop traces, and the pair driver. The pair now requires a live LLM.

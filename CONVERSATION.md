# Conversation

This file is a readme of the cloud-agent threads on the Corgi pair.

Site under test: https://www.corgi.insure

## This thread — real LLMs

Ask: the pair conversation was simulated. Run a real agent-to-agent dialogue with real LLMs.

What changed:

- `--model live` and `--model auto` bind the first ready of `cursor`, `openrouter`, `ollama`. Both throw if none is ready.
- There is no script model.
- The loop stores `toolCalls` on the assistant frame. `mapOpenAI` maps `pin` → system and tool ids. A live model can continue after `ask_peer`.
- This VM had no Cursor or OpenRouter key. Both agents used **ollama `qwen2.5:7b`**.

What ran on 2026-09-08:

| | |
| --- | --- |
| Model | `ollama` / qwen2.5:7b on buyer and seller |
| Peer calls | 3 (one per founder turn) |
| Live completions | 9 |
| Script model | removed |

Buyer asked seller over HTTP. Seller composed a sales report. Buyer composed a founder answer. Full transcript: [experiment/corgi-analysis.md](experiment/corgi-analysis.md).

The 7B seller skipped `map_risks` and invented Stripe and a $1M limit. That is model drift.

```sh
bun experiment/run.ts --site https://www.corgi.insure --model live
```

## Earlier thread — pair harness

PR: https://github.com/TheAgent-net/webagent/pull/1  
Branch: `cursor/layered-cake-harness-a1aa`

That thread built two hosts, hop traces, and the pair driver. It used a deterministic relay when no key was set. That relay is gone. The pair now requires a live LLM.

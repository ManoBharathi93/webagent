# Conversation

This file is a readme of the cloud-agent threads on the Corgi pair.

Site under test: https://www.corgi.insure

## This thread — real LLMs

Ask: the pair conversation was simulated. Run a real agent-to-agent dialogue with real LLMs.

What changed:

- `--model live` binds the first ready of `cursor`, `openrouter`, `ollama`. It throws if none is ready.
- `--model auto` still falls back to `script` for CI.
- The loop stores `toolCalls` on the assistant frame. `mapOpenAI` maps `pin` → system and tool ids. A live model can continue after `ask_peer`.
- This VM had no Cursor or OpenRouter key. Both agents used **ollama `qwen2.5:7b`**.

What ran on 2026-09-08:

| | |
| --- | --- |
| Model | `ollama` / qwen2.5:7b on buyer and seller |
| Peer calls | 3 (one per founder turn) |
| Live completions | 9 |
| Script used | no |

Buyer asked seller over HTTP. Seller composed a sales report. Buyer composed a founder answer. Full transcript: [experiment/corgi-analysis.md](experiment/corgi-analysis.md).

The 7B seller skipped `map_risks` and invented Stripe and a $1M limit. That is model drift, not a script relay.

```sh
bun experiment/run.ts --site https://www.corgi.insure --model live
```

## Earlier thread — pair harness (script)

PR: https://github.com/TheAgent-net/webagent/pull/1  
Branch: `cursor/layered-cake-harness-a1aa`

That thread built two hosts, hop traces, and the pair driver. `CURSOR_API_KEY` was missing, so both runs bound `script`. Local turn time was 1–5 ms. The buyer prefixed `Corgi agent said:` and relayed snippets. It did not write a founder recommendation.

Replay of the script path (CI):

```sh
bun experiment/run.ts --site https://www.corgi.insure --model script
```

# Founder handoff

A new founder stands up one Corgi sales run. The CEO talks from **his** agent. Same `runId` for the whole chain.

## You (founder)

1. Copy `.env.example` to `.env`. Put **your** `OPENROUTER_API_KEY`.
2. Run:

```sh
bun src/cli.ts pair https://www.corgi.insure --keep --turns 0
```

3. Give the CEO one URL. Same machine: `http://127.0.0.1:8787`. Other laptop: the printed LAN URL.
4. They ask their question. Do not send a second prompt. The URL teaches their agent.

The seller binds `0.0.0.0`. Print has two addresses: `http://127.0.0.1:8787` (same machine) and `http://<lan-ip>:8787` (other laptop). `WEBAGENT_PUBLIC_URL` overrides the second if you set a tunnel.

A Cursor sandbox often blocks the LAN IP. Same-machine agents must use `127.0.0.1`. For a public tunnel, set `WEBAGENT_PUBLIC_URL` yourself (ngrok or similar). This repo does not start a tunnel.

`--turns 0` skips the canned buyer script. The host stays up. One run. The CEO asks **his** question.

Default model is `openai/gpt-4o-mini`. Override with `OPENROUTER_MODEL`. `auto` picks cursor, then openrouter, then script.

Do not treat a Cloud Build VM URL as the CEO handoff. Run this on the laptop you take into the room.

## The CEO

See [customer-prompt.md](customer-prompt.md). He pastes the URL and that wire note into **his** Cursor or Claude Code. He types **his** ask.

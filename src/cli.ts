#!/usr/bin/env bun
import { defaultHarness } from "./cake/harness.ts";
import { intake } from "./cake/intake.ts";

const args = process.argv.slice(2);
const h = defaultHarness();

if (!args[0] || args[0] === "help") {
  console.error("usage:");
  console.error("  webagent models              list available models");
  console.error("  webagent ask <text>          one echo run");
  console.error("  webagent serve [addr]        intake HTTP (default :8787)");
  process.exit(args[0] ? 0 : 2);
}

switch (args[0]) {
  case "models":
    for (const m of h.getAvailableModels()) {
      console.log(`${m.ready ? "ok" : "  "}  ${m.id.padEnd(16)} ${m.ready ? "ready" : m.reason}`);
    }
    break;
  case "ask": {
    const text = args.slice(1).join(" ") || "hello";
    const run = h.create({ model: "echo" });
    run.inject({ text });
    const ex = await run.start();
    console.log(ex.lastText);
    break;
  }
  case "serve": {
    const addr = args[1] || ":8787";
    const port = Number(addr.replace(/^.*:/, "")) || 8787;
    Bun.serve({ port, fetch: intake(h) });
    console.error(`intake on :${port}  POST /runs  GET /models  GET /health`);
    await new Promise(() => {});
    break;
  }
  default:
    console.error("unknown command");
    process.exit(2);
}

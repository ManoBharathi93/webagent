import { describe, expect, test } from "bun:test";
import { Harness } from "../src/harness.ts";
import { clientKind } from "../src/host/detect.ts";
import { host } from "../src/host/host.ts";
import { listen } from "../src/host/listen.ts";
import { Room } from "../src/host/room.ts";

describe("host detect", () => {
  test("browser HTML is human", () => {
    expect(
      clientKind(
        new Request("http://t/", {
          headers: {
            Accept: "text/html,application/xhtml+xml",
            "User-Agent": "Mozilla/5.0 Chrome/120",
            "Sec-Fetch-Dest": "document",
          },
        }),
      ),
    ).toBe("human");
  });

  test("MCP and bots are machine", () => {
    expect(clientKind(new Request("http://t/", { headers: { "MCP-Protocol-Version": "2025-06-18" } }))).toBe("machine");
    expect(clientKind(new Request("http://t/", { headers: { Accept: "application/json", "User-Agent": "curl/8.0" } }))).toBe(
      "machine",
    );
    expect(clientKind(new Request("http://t/", { headers: { "User-Agent": "ClaudeBot/1.0" } }))).toBe("machine");
  });
});

describe("host route + shared room", () => {
  test("human GET / is HTML; machine GET / is the agent card", async () => {
    const h = new Harness();
    const room = new Room(h);
    const fetchFn = host(h, room, "https://agent.example");
    const page = await fetchFn(
      new Request("http://t/", { headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0", "Sec-Fetch-Dest": "document" } }),
    );
    expect(page.headers.get("content-type")).toContain("text/html");
    const html = await page.text();
    expect(html).toContain(room.run.id);
    expect(html).toContain("/mcp");

    const card = await fetchFn(new Request("http://t/", { headers: { Accept: "application/json", "User-Agent": "curl/8" } }));
    const body = (await card.json()) as { mcp: string; runId: string; type: string };
    expect(body.type).toBe("webagent");
    expect(body.mcp).toBe("https://agent.example/mcp");
    expect(body.runId).toBe(room.run.id);
  });

  test("human chat and machine say share one run", async () => {
    const h = new Harness();
    const room = new Room(h);
    const fetchFn = host(h, room);
    const human = await fetchFn(
      new Request("http://t/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/html", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ text: "hello from human" }),
      }),
    );
    const hbody = (await human.json()) as { lastText: string };
    expect(hbody.lastText).toContain("hello from human");

    const machine = await fetchFn(
      new Request("http://t/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "curl/8" },
        body: JSON.stringify({ text: "hello from machine" }),
      }),
    );
    const mbody = (await machine.json()) as { lastText: string };
    expect(mbody.lastText).toContain("hello from machine");
    const ctx = room.run.getContext().map((m) => m.content).join("\n");
    expect(ctx).toContain("[human] hello from human");
    expect(ctx).toContain("[machine] hello from machine");
  });

  test("listen prints an http URL and serves the card", async () => {
    const h = new Harness();
    const hosted = listen(h, { port: 0, hostname: "127.0.0.1" });
    try {
      expect(hosted.url).toMatch(/^https?:\/\//);
      const res = await fetch(hosted.url + "/agent.json");
      const card = (await res.json()) as { runId: string };
      expect(card.runId).toBe(hosted.room.run.id);
    } finally {
      hosted.stop();
    }
  });
});

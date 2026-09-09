export type ClientKind = "human" | "machine";

/** Anything that is an agent, IDE, headless browser, or HTTP library — not a person in a tab. */
const MACHINE_UA =
  /bot|gptbot|claude|anthropic|cursor|electron|vscode|codex|aider|playwright|puppeteer|headless|jsdom|happy-dom|curl\/|httpie|python-requests|python-urllib|go-http|axios|undici|node-fetch|node\/|bun\/|wget\/|aiohttp|okhttp|java\/|libwww|scrapy|openai|copilot|gemini|bytespider|slurp|bingbot|duckduckbot|facebookexternalhit|a2a\/|mcp-client|mcp\/|webagent|composio-agent/i;

/**
 * Browser tab vs peer agent.
 * Fail toward machine: A2A is the main use case. HTML is only for a real user click-navigation.
 * Dest=document alone is not enough — Cursor/Playwright URL-open looks like a tab and used to get HTML.
 */
export function clientKind(req: Request): ClientKind {
  const ua = req.headers.get("user-agent") ?? "";
  const accept = (req.headers.get("accept") ?? "").toLowerCase();
  const dest = (req.headers.get("sec-fetch-dest") ?? "").toLowerCase();
  const user = req.headers.get("sec-fetch-user") ?? "";

  if (req.headers.get("mcp-protocol-version") || req.headers.get("mcp-session-id")) return "machine";
  if (req.headers.get("x-agent") || req.headers.get("a2a-version") || req.headers.get("a2a-extensions")) {
    return "machine";
  }
  if (req.headers.get("x-session-id")) return "machine";
  if (MACHINE_UA.test(ua)) return "machine";
  if (
    accept.includes("text/event-stream") ||
    accept.includes("application/json") ||
    accept.includes("application/mcp") ||
    accept.includes("application/ld+json") ||
    accept.includes("text/plain")
  ) {
    return "machine";
  }
  // Real person opened a tab (user-activated document navigation).
  if ((dest === "document" || dest === "iframe") && user === "?1") return "human";
  return "machine";
}

/** Query flags that force the agent card even from a browser. */
export function wantsAgentCard(url: URL): boolean {
  const q = url.searchParams;
  return q.get("agent") === "1" || q.get("format") === "json" || q.get("card") === "1";
}

/** JSON agent card only when the client asked for JSON. Default machine body is text/plain. */
export function wantsJsonCard(req: Request, url: URL): boolean {
  const q = url.searchParams;
  if (q.get("format") === "json" || q.get("card") === "1") return true;
  const accept = (req.headers.get("accept") ?? "").toLowerCase();
  if (!accept || accept === "*/*") return false;
  const json = accept.includes("application/json");
  const text = accept.includes("text/plain") || accept.includes("text/markdown");
  return json && !text;
}

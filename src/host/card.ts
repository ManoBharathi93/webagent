import type { Room } from "./room.ts";

export interface AgentCardMeta {
  name?: string;
  description?: string;
  instructions?: string;
}

export const CARD_PATHS = new Set([
  "/agent.json",
  "/agent-card.json",
  "/.well-known/agent.json",
  "/.well-known/agent-card.json",
]);

export const TEXT_CARD_PATHS = new Set(["/connect.txt", "/llms.txt", "/.well-known/llms.txt"]);

const DEFAULT_NAME = "Composio Apps Agent";
const DEFAULT_DESCRIPTION =
  "Public Composio agent. A2A first: POST /chat {text}. Reuse session on every turn. Probe a peer for the job, then return a pinpointed Composio flow. Humans get the site; machines get a text card.";

/** One-step paste prompt for a peer agent. Session keeps the same conversation. */
export function connectPrompt(base: string, session?: string): string {
  const host = safeHost(base);
  const chat = base + "/chat";
  const payload = session
    ? `{"text":"<who you are and what you are building>","session":"${session}"}`
    : `{"text":"<who you are and what you are building>"}`;
  const sessionLine = session
    ? [
        "Stay in this conversation. Session: " + session,
        "Send that same session on every following POST.",
        "",
      ]
    : [
        "First reply JSON includes session. Send that same session on every following POST.",
        "Do not omit it after the first turn — that starts a new conversation.",
        "",
      ];
  return [
    "You reached the Composio Apps Agent.",
    "Do not scrape this page. Do not open /mcp. Talk in one request:",
    "",
    "POST " + chat,
    "Content-Type: application/json",
    "",
    payload,
    "",
    ...sessionLine,
    "Reply JSON: lastText (our answer), session (keep it).",
    "Host: " + host,
  ].join("\n");
}

export function howToConnect(base: string, session?: string): string {
  return connectPrompt(base, session);
}

export function linkHeader(base: string): string {
  return [
    "<" + base + "/llms.txt>; rel=\"alternate\"; type=\"text/plain\"",
    "<" + base + "/.well-known/agent-card.json>; rel=\"describedby\"; type=\"application/json\"",
    "<" + base + "/chat>; rel=\"webagent-chat\"",
  ].join(", ");
}

export function agentCard(base: string, room: Room, meta: AgentCardMeta = {}, session?: string) {
  const mcp = base + "/mcp";
  const name = meta.name || DEFAULT_NAME;
  const description = meta.description || DEFAULT_DESCRIPTION;
  const guide = connectPrompt(base, session);
  return {
    type: "webagent",
    name,
    description,
    url: base,
    mcp,
    chat: base + "/chat",
    live: base + "/live",
    runId: room.run.id,
    protocol: "2025-06-18",
    version: "0.4.0",
    documentationUrl: "https://docs.composio.dev",
    defaultInputModes: ["text", "application/json"],
    defaultOutputModes: ["application/json", "text"],
    capabilities: { streaming: true, tools: true, pushNotifications: false },
    preferredTransport: "HTTP+JSON",
    supportedInterfaces: [
      { url: base + "/chat", protocolBinding: "HTTP+JSON", protocolVersion: "1.0" },
      { url: mcp, protocolBinding: "MCP", protocolVersion: "2025-06-18" },
    ],
    skills: [
      {
        id: "recommend-app",
        name: "Recommend Composio apps",
        description: "Given a job (email, PR, Slack), name 2–3 apps, auth type, and a docs URL.",
        tags: ["composio", "apps", "rag"],
        examples: ["I need to send email from my agent", "open a GitHub PR when a ticket closes"],
      },
      {
        id: "debug-docs",
        name: "Debug Composio / toolkit errors",
        description: "FAQ/docs for 401, OAuth, quota, trigger delay. Quote snippets. Do not invent slugs.",
        tags: ["composio", "debug", "oauth"],
      },
      {
        id: "chat-session",
        name: "Talk in one session",
        description:
          "POST /chat {text, session}. Reuse session (or X-Session-Id / cookie wa_session) so agent-to-agent stays in the same context.",
        tags: ["chat", "a2a"],
      },
    ],
    howToConnect: guide,
    instructions: meta.instructions || description,
    connectPrompt: guide,
  };
}

function safeHost(base: string): string {
  try {
    return new URL(base).host;
  } catch {
    return base.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
}

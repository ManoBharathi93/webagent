/** Map a Composio app slug or page category onto a short kind and default uses. */

export interface KindRule {
  kind: string;
  match: RegExp;
  uses: string[];
}

export const KIND_RULES: KindRule[] = [
  { kind: "email", match: /gmail|outlook|mailchimp|sendgrid|mailgun|postmark|zoho.?mail|yahoo|imap|smtp|resend|mailjet/i, uses: ["send email", "read inbox", "search mail"] },
  { kind: "chat", match: /slack|discord|teams|telegram|whatsapp|mattermost|rocketchat|guild/i, uses: ["post message", "read channel"] },
  { kind: "git", match: /github|gitlab|bitbucket|gitea|gogs/i, uses: ["create issue", "open pull request", "list repos"] },
  { kind: "calendar", match: /calendar|calendly|cal_com|calcom/i, uses: ["create event", "list events"] },
  { kind: "crm", match: /salesforce|hubspot|pipedrive|attio|affinity|close.?io|zoho.?crm|copper/i, uses: ["create contact", "update deal"] },
  { kind: "tickets", match: /jira|linear|asana|clickup|trello|monday|zendesk|freshdesk|pagerduty|servicenow|shortcut/i, uses: ["create ticket", "list issues"] },
  { kind: "docs", match: /notion|confluence|googledocs|coda|outline|wiki/i, uses: ["create page", "search docs"] },
  { kind: "files", match: /drive|dropbox|box\b|onedrive|one_drive|s3|share.?point|gcs/i, uses: ["upload file", "list files"] },
  { kind: "pay", match: /stripe|paypal|square|braintree|razorpay|chargebee/i, uses: ["create charge", "list invoices"] },
  { kind: "sheet", match: /sheet|airtable|excel|rows/i, uses: ["read rows", "write rows"] },
  { kind: "social", match: /twitter|x_|linkedin|instagram|facebook|tiktok|reddit|youtube|threads/i, uses: ["post update", "read feed"] },
  { kind: "meet", match: /zoom|googlemeet|google.?meet|webex/i, uses: ["create meeting"] },
  { kind: "search", match: /serpapi|tavily|perplexity|algolia|exa|browser/i, uses: ["web search"] },
  { kind: "code", match: /supabase|vercel|netlify|heroku|digital.?ocean|aws|cloudflare|firebase/i, uses: ["deploy", "query database"] },
];

export function kindOf(slug: string, category = ""): string {
  const hay = slug + " " + category;
  if (category && /^[a-z][a-z0-9_-]{1,24}$/i.test(category.trim())) {
    const cat = category.trim().toLowerCase().replace(/\s+/g, "_");
    if (KIND_RULES.some((r) => r.kind === cat)) return cat;
    if (cat === "communication") return "chat";
    if (cat === "developer_tools" || cat === "developer") return "git";
  }
  for (const r of KIND_RULES) if (r.match.test(hay)) return r.kind;
  return "other";
}

export function usesFor(kind: string, tools: string[] = []): string[] {
  const rule = KIND_RULES.find((r) => r.kind === kind);
  const fromKind = rule?.uses ?? [];
  const fromTools = tools.map(useFromTool).filter(Boolean) as string[];
  return unique([...fromTools, ...fromKind]).slice(0, 8);
}

/** GMAIL_SEND_EMAIL → "send email". */
export function useFromTool(slug: string): string {
  const parts = slug.toLowerCase().split("_").filter((p) => p && !SKIP.has(p));
  if (parts.length < 2) return "";
  const verb = parts[0]!;
  const rest = parts.slice(1).join(" ");
  if (!VERBS.has(verb)) return rest || slug.toLowerCase().replace(/_/g, " ");
  return (verb + " " + rest).trim();
}

const VERBS = new Set([
  "send", "create", "list", "get", "read", "write", "update", "delete", "search",
  "post", "upload", "download", "open", "close", "fetch", "add", "remove", "set",
]);

const SKIP = new Set(["gmail", "github", "slack", "google", "microsoft", "the", "a"]);

function unique(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.toLowerCase();
    if (seen.has(k) || k.length < 3) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

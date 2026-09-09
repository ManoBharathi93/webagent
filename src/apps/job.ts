/** Skip catalog lookup on greetings and meta asks. Keep short real jobs. */

const NAMED_JOB =
  /\b(github|gitlab|bitbucket|slack|linear|jira|notion|gmail|outlook|discord|pagerduty|zendesk|salesforce|hubspot|asana|trello|figma|stripe|twilio|sendgrid|posthog|fathom|drive|calendar|email|mail|spreadsheet|sheet|mcp|oauth|cli|webhook|trigger|pull requests?|issues?|skills?)\b/i;

const GENERIC_ASK =
  /\b(how can (you|this|it|composio) (help|be)|what (can|do) you (do|offer)|who are you|what is (composio|this|that)|tell me about|beneficial|personalised to our work|personalized to our work|be useful to us|how does this work|help me)\b/i;

const GREETING = /^(hi|hello|hey|thanks|thank you|ok|okay|yo)[\s!.?]*$/i;

const JOB_VERB =
  /\b(create|creating|send|sending|sync|syncing|file|filing|open|opening|post|posting|list|update|updating|delete|search|connect|trigger|fetch|pull|push|invite|schedule|notify|track|export|import|share|upload|download|book|assign|close|merge|comment)\b/i;

const LIGHT = new Set([
  "a",
  "an",
  "the",
  "to",
  "for",
  "my",
  "our",
  "me",
  "us",
  "in",
  "on",
  "of",
  "and",
  "or",
  "please",
  "need",
  "want",
  "i",
  "we",
]);

const VERBS = new Set([
  "create",
  "creating",
  "send",
  "sending",
  "sync",
  "syncing",
  "file",
  "filing",
  "open",
  "opening",
  "post",
  "posting",
  "list",
  "update",
  "updating",
  "delete",
  "search",
  "connect",
  "trigger",
  "fetch",
  "pull",
  "push",
  "invite",
  "schedule",
  "notify",
  "track",
  "export",
  "import",
  "share",
  "upload",
  "download",
  "book",
  "assign",
  "close",
  "merge",
  "comment",
]);

export function jobIsConcrete(request: string): boolean {
  const t = request.trim();
  if (!t) return false;
  if (GREETING.test(t)) return false;
  if (NAMED_JOB.test(t)) return true;
  if (GENERIC_ASK.test(t)) return false;
  if (!JOB_VERB.test(t)) return false;
  const rest = t
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 1 && !LIGHT.has(w) && !VERBS.has(w));
  return rest.length >= 1;
}

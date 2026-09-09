/** Refuse catalog dumps when the visitor has not named a job yet. */

const NAMED_JOB =
  /\b(github|gitlab|bitbucket|slack|linear|jira|notion|gmail|outlook|discord|pagerduty|zendesk|salesforce|hubspot|asana|trello|figma|stripe|twilio|sendgrid|posthog|fathom|drive|calendar|email|mail|spreadsheet|sheet|mcp|oauth|cli|webhook|trigger|pull requests?|issues?|skills?)\b/i;

const GENERIC_ASK =
  /\b(how can (you|this|it|composio) (help|be)|what (can|do) you (do|offer)|who are you|tell me about|beneficial|personalised to our work|personalized to our work|be useful to us|how does this work)\b/i;

const STOP = new Set([
  "the",
  "and",
  "for",
  "you",
  "are",
  "what",
  "does",
  "can",
  "how",
  "from",
  "with",
  "this",
  "that",
  "need",
  "get",
  "our",
  "your",
  "want",
  "using",
  "composio",
  "please",
  "help",
  "into",
  "my",
  "an",
  "to",
  "of",
  "in",
  "on",
  "or",
  "is",
  "it",
  "we",
  "us",
  "i",
  "a",
  "work",
  "agent",
  "short",
  "fully",
]);

export function jobIsConcrete(request: string): boolean {
  const t = request.trim();
  if (!t) return false;
  if (NAMED_JOB.test(t)) return true;
  if (GENERIC_ASK.test(t)) return false;
  const words = t
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return words.length >= 6;
}

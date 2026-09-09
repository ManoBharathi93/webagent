/** Refuse catalog dumps on meta “how can you help” asks. Short jobs still look up. */

const NAMED_JOB =
  /\b(github|gitlab|bitbucket|slack|linear|jira|notion|gmail|outlook|discord|pagerduty|zendesk|salesforce|hubspot|asana|trello|figma|stripe|twilio|sendgrid|posthog|fathom|drive|calendar|email|mail|spreadsheet|sheet|mcp|oauth|cli|webhook|trigger|pull requests?|issues?|skills?)\b/i;

const GENERIC_ASK =
  /\b(how can (you|this|it|composio) (help|be)|what (can|do) you (do|offer)|who are you|tell me about|beneficial|personalised to our work|personalized to our work|be useful to us|how does this work)\b/i;

export function jobIsConcrete(request: string): boolean {
  const t = request.trim();
  if (!t) return false;
  if (NAMED_JOB.test(t)) return true;
  if (GENERIC_ASK.test(t)) return false;
  return true;
}

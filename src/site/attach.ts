/**
 * Bind a crawled pack onto a Harness using only public controls.
 * Does not touch the loop.
 */
import type { Harness } from "../harness.ts";
import type { Run } from "../run.ts";
import type { Tool } from "../tools.ts";
import type { SiteFlow, SitePack } from "./types.ts";

export function attachPack(h: Harness, pack: SitePack, opts?: { model?: string }): Run {
  h.addTool(lookupTool(pack));
  for (const flow of pack.flows) h.addTool(flowTool(flow));

  const run = h.create({
    model: opts?.model,
    instruction: pack.instruction,
    tools: [lookupTool(pack), ...pack.flows.map(flowTool)],
  });
  if (pack.facts.length) run.inject({ vars: pack.facts.join("\n") });
  return run;
}

function lookupTool(pack: SitePack): Tool {
  return {
    name: "site_lookup",
    description: "Search crawled pages and facts to answer a visitor",
    schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    async call(args) {
      const q = String(args.query ?? "").toLowerCase();
      const hits: { url: string; title: string; snippet: string }[] = [];
      for (const p of pack.pages) {
        const hay = (p.title + " " + p.headings.join(" ") + " " + p.text).toLowerCase();
        if (!q || hay.includes(q)) {
          hits.push({ url: p.url, title: p.title, snippet: p.text.slice(0, 240) });
        }
        if (hits.length >= 6) break;
      }
      return { origin: pack.origin, hits, questions: pack.starterQuestions };
    },
  };
}

function flowTool(flow: SiteFlow): Tool {
  return {
    name: "flow_" + flow.id,
    description: flow.purpose,
    schema: { type: "object", properties: {} },
    async call() {
      return { id: flow.id, name: flow.name, purpose: flow.purpose, steps: flow.steps };
    },
  };
}

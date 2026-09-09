/**
 * Bind the Composio pack as an apps agent. Public controls only.
 */
import type { Harness } from "../harness.ts";
import type { Run } from "../run.ts";
import { attachPack } from "../site/attach.ts";
import { hasCorpus, loadCorpus, lookupCorpus } from "../site/corpus.ts";
import type { SitePack } from "../site/types.ts";
import type { Tool } from "../tools.ts";
import { loadGraph } from "./graph.ts";
import { appsInstruction } from "./prompt.ts";
import { queryGraph } from "./query.ts";
import { CORPUS_COMPOSIO, type AppGraph } from "./types.ts";

export function attachApps(
  h: Harness,
  pack: SitePack,
  opts?: { model?: string; graph?: AppGraph },
): Run {
  const graph = opts?.graph ?? (pack.corpusDir ? loadGraph(pack.corpusDir) : undefined);
  const run = attachPack(h, pack, { model: opts?.model, instruction: appsInstruction() });
  if (graph) {
    const rec = recommendTool(graph);
    const dbg = debugTool(graph, pack);
    h.addTool(rec);
    h.addTool(dbg);
    run.useTool(rec);
    run.useTool(dbg);
  }
  return run;
}

export function loadAppsPack(dir = CORPUS_COMPOSIO): SitePack {
  if (!hasCorpus(dir)) throw new Error("missing Composio corpus at " + dir + ". Run bun experiment/scrape-composio.ts");
  return loadCorpus(dir);
}

function recommendTool(graph: AppGraph): Tool {
  return {
    name: "recommend_app",
    description: "Graph RAG: rank Composio apps for a request by kind and use. Returns apps, uses, and docs.",
    schema: { type: "object", properties: { request: { type: "string" } }, required: ["request"] },
    async call(args) {
      const request = String(args.request ?? "");
      const hit = queryGraph(graph, request, 6);
      return {
        request,
        kinds: hit.kinds,
        uses: hit.uses,
        apps: hit.apps.map((a) => ({
          slug: a.slug,
          name: a.name,
          kind: a.kind,
          auth: a.auth,
          tools: a.tools,
          why: a.why,
          url: a.url,
        })),
        docs: hit.pages.slice(0, 4).map((p) => ({ title: p.title, url: p.url, role: p.role })),
      };
    },
  };
}

function debugTool(graph: AppGraph, pack: SitePack): Tool {
  return {
    name: "debug_docs",
    description: "Find FAQ and docs pages that match an error or app slug. Graph first, then file snippets.",
    schema: {
      type: "object",
      properties: { error: { type: "string" }, app: { type: "string" } },
      required: ["error"],
    },
    async call(args) {
      const error = String(args.error ?? "");
      const app = String(args.app ?? "");
      const q = [error, app].filter(Boolean).join(" ");
      const hit = queryGraph(graph, q, 8);
      const faqs = hit.pages.filter((p) => p.role === "faq" || p.role === "debug" || p.role === "auth");
      const files = pack.corpusDir ? lookupCorpus(pack.corpusDir, q, 4) : [];
      return {
        error,
        app,
        faqs: (faqs.length ? faqs : hit.pages).slice(0, 5),
        files: files.map((f) => ({ url: f.url, title: f.title, snippet: f.snippet })),
      };
    },
  };
}

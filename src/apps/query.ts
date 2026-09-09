/**
 * Dual-level Graph RAG query.
 * High: kind + use. Low: app name/slug + FAQ/error text.
 * Walk one hop to collect apps and debug pages.
 */
import { leadSlugs } from "./kind.ts";
import type { AppGraph, AppHit, GraphAsk, GraphNode, PageHit } from "./types.ts";

const STOP = new Set([
  "the", "and", "for", "you", "are", "what", "does", "can", "how", "from", "with", "this", "that",
  "need", "get", "our", "your", "want", "using", "composio", "please", "help", "into", "my",
  "an", "to", "of", "in", "on", "or", "is", "it", "we", "i", "a",
]);

export function queryGraph(graph: AppGraph, question: string, limit = 6): GraphAsk {
  const q = question.toLowerCase();
  const words = tokens(question);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const seed = new Map<string, number>();

  for (const n of graph.nodes) {
    const hay = (n.label + " " + Object.values(n.meta).join(" ")).toLowerCase();
    let score = 0;
    if (n.kind === "use" && q.includes(n.label.toLowerCase())) score += 14;
    if (n.kind === "kind" && (q.includes(n.label) || words.includes(n.label))) score += 10;
    for (const w of words) {
      if (n.kind === "kind" && (n.label === w || hay.includes(w))) score += 8;
      else if (n.kind === "use" && hay.includes(w)) score += 6;
      else if (n.kind === "app" && (n.meta.slug?.toLowerCase() === w || n.label.toLowerCase() === w)) score += 12;
      else if (n.kind === "app" && hay.includes(w)) score += 4;
      else if (n.kind === "page" && hay.includes(w)) score += n.meta.role === "faq" ? 7 : 3;
    }
    if (score) seed.set(n.id, score);
  }

  const appScore = new Map<string, { score: number; why: string[] }>();
  const pageScore = new Map<string, number>();
  const kinds = new Set<string>();
  const uses = new Set<string>();

  const bumpApp = (id: string, add: number, why: string) => {
    const n = byId.get(id);
    if (!n || n.kind !== "app") return;
    const cur = appScore.get(id) ?? { score: 0, why: [] };
    cur.score += add;
    if (why && !cur.why.includes(why)) cur.why.push(why);
    appScore.set(id, cur);
  };

  const rankApp = (n: GraphNode, base: number): number => {
    const slug = (n.meta.slug || "").toUpperCase();
    const kind = n.meta.kind || "";
    const tools = Number(n.meta.tools || 0);
    let extra = Math.min(tools, 80) / 20;
    if (leadSlugs(kind).includes(slug)) extra += 6;
    return base + extra;
  };

  for (const [id, s] of seed) {
    const n = byId.get(id)!;
    if (n.kind === "app") bumpApp(id, s, "name match");
    if (n.kind === "kind") kinds.add(n.label);
    if (n.kind === "use") uses.add(n.label);
    if (n.kind === "page") pageScore.set(id, (pageScore.get(id) ?? 0) + s);
  }

  for (const e of graph.edges) {
    if (e.rel === "in_kind" && seed.has(e.to)) {
      const kind = byId.get(e.to)?.label || "kind";
      kinds.add(kind);
      bumpApp(e.from, (seed.get(e.to) ?? 0) + 4, "kind: " + kind);
    }
    if (e.rel === "solves" && seed.has(e.to)) {
      const use = byId.get(e.to)?.label || "use";
      uses.add(use);
      bumpApp(e.from, (seed.get(e.to) ?? 0) + 6, "use: " + use);
    }
    if (e.rel === "faq" && (seed.has(e.to) || seed.has(e.from))) {
      bumpApp(e.from, 3, "faq");
      pageScore.set(e.to, (pageScore.get(e.to) ?? 0) + 5);
    }
    if (e.rel === "docs" && (seed.has(e.from) || appScore.has(e.from))) {
      pageScore.set(e.to, (pageScore.get(e.to) ?? 0) + 4);
    }
  }

  const apps: AppHit[] = [...appScore.entries()]
    .map(([id, v]) => {
      const n = byId.get(id)!;
      return hitFrom(n, rankApp(n, v.score), v.why);
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const topApps = new Set(apps.map((a) => a.slug.toLowerCase()));
  for (const e of graph.edges) {
    if ((e.rel === "faq" || e.rel === "docs") && topApps.has(e.from.replace(/^app:/, ""))) {
      pageScore.set(e.to, (pageScore.get(e.to) ?? 0) + 2);
    }
  }

  const pages: PageHit[] = [...pageScore.entries()]
    .map(([id, score]) => pageFrom(byId.get(id)!, score))
    .filter((p) => p.url)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { apps, pages, kinds: [...kinds], uses: [...uses] };
}

function hitFrom(n: GraphNode, score: number, why: string[]): AppHit {
  return {
    slug: n.meta.slug || n.id.replace(/^app:/, "").toUpperCase(),
    name: n.label,
    kind: n.meta.kind || "",
    auth: n.meta.auth || "",
    tools: Number(n.meta.tools || 0),
    score,
    why,
    url: n.meta.url || "",
  };
}

function pageFrom(n: GraphNode, score: number): PageHit {
  return {
    url: n.meta.url || "",
    title: n.label,
    role: n.meta.role || "guide",
    score,
    snippet: (n.meta.snippet || "").replace(/\s+/g, " ").trim().slice(0, 280),
  };
}

function tokens(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

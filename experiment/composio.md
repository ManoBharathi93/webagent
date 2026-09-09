# Composio webagent

Typed **Graph RAG** over Composio apps and docs.

This is not generic vector search and not LLM entity extraction (graphify-style). The catalog is already typed: Toolkit, Slug, Auth, Category, Tools, FAQs. The useful graph is the routing path a builder already has in their head:

a request → kind (email, git, chat) → use (send email, create issue) → app (Gmail, GitHub) → FAQ/docs for debug.

Dual-level retrieval (LightRAG idea, no extra service) matches kind/use first, then app name and FAQ text, then walks one hop. Lead slugs (Gmail, GitHub, Slack) win ties so a 1,500-app catalog does not dump every mail vendor.

```
kind ──in_kind── app ──solves── use
                 │
                 ├──docs── guide / auth page
                 └──faq─── "Why 401?" snippet
```

Query is dual-level (same idea as LightRAG, no extra service):

1. **High:** match kind and use nodes
2. **Low:** match app slug/name and FAQ/error text
3. Walk one hop. Rank a few apps. Return neighboring docs.

Firecrawl runs **once**. The agent reads `corpus/composio`. It does not call Firecrawl at run time.

```sh
set -a; . .env; set +a
bun experiment/scrape-composio.ts          # crawl docs.composio.dev
bun experiment/scrape-composio.ts --must   # add catalog + popular apps if a crawl missed them
bun experiment/build-graph.ts              # rebuild graph.json from files
webagent apps                              # public host
```

| Tool | Job |
| --- | --- |
| `recommend_app` | Graph walk: request → apps + why + docs URLs |
| `debug_docs` | FAQ / auth / error pages for a slug + error string |
| `site_lookup` | Snippets from local markdown |

Do not invent a tool slug. If the graph has no match, say so.

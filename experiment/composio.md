# Composio webagent

Typed **Graph RAG** over Composio apps and docs. Not generic vector search.

The catalog is a routing problem: a request → kind (email, git, chat) → use (send email, create issue) → app (Gmail, GitHub) → FAQ/docs for debug.

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
bun experiment/build-graph.ts              # rebuild graph.json from files
webagent apps                              # public host
```

| Tool | Job |
| --- | --- |
| `recommend_app` | Graph walk: request → apps + why + docs URLs |
| `debug_docs` | FAQ / auth / error pages for a slug + error string |
| `site_lookup` | Snippets from local markdown |

Do not invent a tool slug. If the graph has no match, say so.

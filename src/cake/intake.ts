import type { Harness } from "./harness.ts";

/** Thin HTTP edge: many requests → many runs. No reasoning here. */
export function intake(harness: Harness): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/models") {
      return Response.json(harness.getAvailableModels());
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json(harness.getHealth());
    }
    if (req.method === "POST" && url.pathname === "/runs") {
      const body = (await req.json().catch(() => ({}))) as { text?: string; model?: string };
      const run = harness.create({ model: body.model ?? "echo" });
      if (body.text) run.inject({ text: body.text });
      const result = await harness.scheduler.run(() => run.start());
      return Response.json(result);
    }
    if (req.method === "GET" && url.pathname.startsWith("/runs/")) {
      const id = url.pathname.slice("/runs/".length);
      const run = harness.get(id);
      if (!run) return new Response("not found", { status: 404 });
      return Response.json(run.explain());
    }
    return new Response("not found", { status: 404 });
  };
}

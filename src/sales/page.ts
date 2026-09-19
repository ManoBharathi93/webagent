import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Room } from "../host/room.ts";
import { corgiWidget } from "./widget.ts";

export const CORGI_SITE_ROOT = join(import.meta.dir, "../../site/corgi");

export function hasCorgiSnapshot(): boolean {
  return existsSync(join(CORGI_SITE_ROOT, "index.html"));
}

export function corgiChatPage(room: Room, publicUrl: string): Response {
  const html = hasCorgiSnapshot()
    ? inject(readCorgiIndex(), corgiWidget(publicUrl, room.run.id))
    : corgiLandingPage(room, publicUrl);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Link: `<${publicUrl}/.well-known/agent-card.json>; rel="describedby"; type="application/json"`,
    },
  });
}

function readCorgiIndex(): string {
  return readFileSync(join(CORGI_SITE_ROOT, "index.html"), "utf8");
}

function inject(html: string, widget: string): string {
  if (html.includes("</body>")) return html.replace("</body>", widget + "</body>");
  return html + widget;
}

function corgiLandingPage(room: Room, publicUrl: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Corgi — Startup Insurance</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a; color: #e2e8f0;
      min-height: 100vh;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .hero {
      max-width: 48rem; padding: 3rem 2rem; text-align: center;
    }
    .hero h1 {
      font-size: 2.5rem; font-weight: 800; color: #f1f5f9;
      margin-bottom: 1rem; line-height: 1.2;
    }
    .hero h1 span { color: #60a5fa; }
    .hero p {
      font-size: 1.1rem; color: #94a3b8; line-height: 1.7;
      margin-bottom: 2rem; max-width: 36rem; margin-left: auto; margin-right: auto;
    }
    .cta-row { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .cta {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .75rem 1.5rem; border-radius: 10px;
      font-size: .9rem; font-weight: 600; text-decoration: none;
      transition: all .2s;
    }
    .cta-primary { background: #2563eb; color: #fff; border: 0; }
    .cta-primary:hover { background: #3b82f6; }
    .cta-secondary { background: transparent; color: #93c5fd; border: 1px solid rgba(96,165,250,.3); }
    .cta-secondary:hover { background: rgba(96,165,250,.1); }
    .features {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: 1.5rem; max-width: 48rem; padding: 2rem; margin-top: 2rem;
    }
    .feature {
      background: #1e293b; border: 1px solid rgba(147,197,253,.08);
      border-radius: 12px; padding: 1.25rem;
    }
    .feature h3 { font-size: .85rem; color: #f1f5f9; margin-bottom: .4rem; }
    .feature p { font-size: .8rem; color: #64748b; line-height: 1.5; }
    .footer {
      padding: 2rem; text-align: center; color: #475569; font-size: .75rem;
    }
    .footer a { color: #60a5fa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>Startup Insurance at the <span>Speed of Compute</span></h1>
    <p>
      Get a personalized risk assessment in seconds. Tell our advisor what your
      startup does and receive vulnerability analysis, coverage recommendations,
      and premium estimates — all grounded in real Corgi data.
    </p>
    <div class="cta-row">
      <a class="cta cta-primary" href="https://www.corgi.insure" target="_blank">Get a Quote on Corgi</a>
      <a class="cta cta-secondary" href="https://www.corgi.insure/book-a-demo" target="_blank">Book a Demo</a>
    </div>
  </div>
  <div class="features">
    <div class="feature">
      <h3>🔍 Risk Assessment</h3>
      <p>Specific vulnerabilities for your industry with likelihood estimates.</p>
    </div>
    <div class="feature">
      <h3>📋 Coverage Match</h3>
      <p>CGL, D&O, Tech E&O, Cyber — matched to your stage and product risks.</p>
    </div>
    <div class="feature">
      <h3>💰 Premium Estimates</h3>
      <p>Cost ranges grounded in Corgi's published data. Not a bind.</p>
    </div>
    <div class="feature">
      <h3>🤖 A2A Ready</h3>
      <p>Your agent can POST /chat to get an assessment. Reuse session for follow-ups.</p>
    </div>
  </div>
  <div class="footer">
    Powered by <a href="https://www.corgi.insure" target="_blank">Corgi</a> ·
    <a href="${esc(publicUrl)}/agent.json">Agent Card</a> ·
    <a href="${esc(publicUrl)}/llms.txt">Connect Prompt</a>
  </div>
  ${corgiWidget(publicUrl, room.run.id)}
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

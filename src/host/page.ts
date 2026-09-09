import { connectPrompt } from "./card.ts";
import type { Room } from "./room.ts";

/** Human landing page: Composio-styled site + chat + A2A paste/copy. */
export function chatPage(room: Room, publicUrl: string): Response {
  const prompt = connectPrompt(publicUrl);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Composio — Apps Agent</title>
  <link rel="alternate" type="application/json" href="/agent.json"/>
  <link rel="describedby" href="/.well-known/agent-card.json"/>
  <meta name="mcp" content="${esc(publicUrl)}/mcp"/>
  <style>
    :root {
      --bg: #000;
      --card: #0a1929;
      --text: #fff;
      --muted: #9aa3ad;
      --cyan: #00d4ff;
      --cyan-d: #00b8d4;
      --ok: #00cc66;
      --mono: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
      --sans: ui-sans-serif, system-ui, "Segoe UI", Inter, sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--sans); }
    a { color: inherit; text-decoration: none; }
    .glitch {
      position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
      background:
        repeating-linear-gradient(90deg, transparent 0 38px, rgba(0,212,255,.08) 38px 40px, transparent 40px 78px),
        repeating-linear-gradient(90deg, transparent 0 92px, rgba(0,102,255,.14) 92px 96px, transparent 96px 140px),
        repeating-linear-gradient(90deg, transparent 0 160px, rgba(0,255,212,.07) 160px 163px, transparent 163px 210px);
      mask-image: linear-gradient(180deg, #000 0%, #000 55%, transparent 100%);
      animation: drift 18s linear infinite;
    }
    @keyframes drift { to { background-position: 220px 0, -140px 0, 80px 0; } }
    .wrap { position: relative; z-index: 1; }
    nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.1rem 2rem; max-width: 1200px; margin: 0 auto;
    }
    .logo { font-weight: 700; letter-spacing: -.03em; font-size: 1.15rem; }
    .logo span { opacity: .45; font-weight: 500; margin-left: .4rem; font-size: .8rem; }
    .nav-links { display: flex; gap: 1.4rem; align-items: center; font-size: .78rem; letter-spacing: .06em; color: #d5d5d5; }
    .nav-links a:hover { color: #fff; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      font-family: var(--mono); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase;
      padding: .7rem 1rem; border: 1px solid #fff; cursor: pointer; background: transparent; color: #fff;
    }
    .btn.solid { background: #fff; color: #000; }
    .btn:hover { opacity: .88; }
    .hero { text-align: center; padding: 4.5rem 1.25rem 2.5rem; max-width: 860px; margin: 0 auto; }
    .hero h1 { font-size: clamp(2.2rem, 6vw, 3.8rem); line-height: 1.05; letter-spacing: -.04em; margin: 0 0 1.1rem; font-weight: 700; }
    .hero p.lead { color: var(--muted); font-size: 1.05rem; line-height: 1.55; margin: 0 auto 1.8rem; max-width: 36rem; }
    .ctas { display: flex; gap: .7rem; justify-content: center; flex-wrap: wrap; }
    .fine { margin-top: 1rem; color: #6e7680; font-size: .8rem; }
    .logos { display: flex; gap: 1.6rem; justify-content: center; flex-wrap: wrap; padding: 1.5rem 1rem 3rem; color: #8b9198; font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; }
    .bridge {
      max-width: 920px; margin: 0 auto 2.5rem; padding: 1.15rem 1.25rem;
      border: 1px solid rgba(255,255,255,.12); background: rgba(10,25,41,.72);
    }
    .bridge h2 { margin: 0 0 .45rem; font-size: 1rem; font-weight: 600; }
    .bridge p { margin: 0 0 .85rem; color: var(--muted); font-size: .92rem; line-height: 1.5; }
    .paste { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
    .paste code {
      flex: 1; min-width: 16rem; font-family: var(--mono); font-size: .78rem;
      background: #050a14; padding: .65rem .75rem; border: 1px solid rgba(255,255,255,.08);
      overflow: auto; color: var(--cyan);
    }
    .stage { max-width: 1100px; margin: 0 auto 4rem; padding: 0 1.25rem; display: grid; grid-template-columns: 1.15fr .85fr; gap: 1rem; }
    @media (max-width: 840px) {
      .stage { grid-template-columns: 1fr; }
      .nav-links span { display: none; }
    }
    .panel { background: var(--card); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; min-height: 28rem; display: flex; flex-direction: column; }
    .panel-h { display: flex; justify-content: space-between; align-items: center; padding: .85rem 1rem; border-bottom: 1px solid rgba(255,255,255,.08); font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: #c5cdd6; }
    .dot { width: .5rem; height: .5rem; border-radius: 50%; background: var(--ok); display: inline-block; margin-right: .4rem; }
    #log { flex: 1; overflow: auto; padding: 1rem; }
    .row { margin: .55rem 0; font-size: .92rem; line-height: 1.45; }
    .human { color: #9ad8ff; }
    .machine { color: #d7b3ff; }
    .agent { color: #e8eef5; white-space: pre-wrap; }
    form.chat { display: flex; gap: .55rem; padding: .85rem; border-top: 1px solid rgba(255,255,255,.08); }
    form.chat input {
      flex: 1; background: #050a14; border: 1px solid rgba(255,255,255,.12); color: #fff;
      padding: .7rem .8rem; border-radius: 999px; outline: none; font: inherit;
    }
    form.chat button.send {
      width: 2.4rem; height: 2.4rem; border-radius: 50%; border: 0; background: var(--cyan-d); color: #001018; cursor: pointer; font-size: 1rem;
    }
    .side { padding: 1.1rem 1.15rem 1.3rem; }
    .side h3 { margin: 0 0 .6rem; font-size: 1.15rem; }
    .side ol { margin: 0; padding-left: 1.1rem; color: var(--muted); font-size: .88rem; line-height: 1.55; }
    .side li { margin: .35rem 0; }
    .toast { position: fixed; bottom: 1.2rem; left: 50%; transform: translateX(-50%); background: #fff; color: #000; padding: .45rem .8rem; font-size: .78rem; opacity: 0; pointer-events: none; transition: opacity .2s; z-index: 5; }
    .toast.on { opacity: 1; }
    footer { text-align: center; color: #5c636b; font-size: .75rem; padding: 0 1rem 2.5rem; }
  </style>
</head>
<body>
  <div class="glitch" aria-hidden="true"></div>
  <div class="wrap">
    <nav>
      <div class="logo">Composio<span>apps agent</span></div>
      <div class="nav-links">
        <span>PRODUCTS</span><span>SOLUTIONS</span><span>RESOURCES</span>
        <a class="btn solid" href="#talk">Get started</a>
      </div>
    </nav>
    <header class="hero">
      <h1>Everything your agents<br/>need to take action</h1>
      <p class="lead">1,500+ integrations with just-in-time tool calls. Ask this page which app fits — or let your agent talk to ours.</p>
      <div class="ctas">
        <a class="btn solid" href="#talk">Talk to the agent</a>
        <a class="btn" href="#paste">Get a demo</a>
      </div>
      <p class="fine">Local Graph RAG · no scrape at run time · run ${esc(room.run.id)}</p>
    </header>
    <div class="logos">Gmail · Slack · GitHub · Notion · Stripe · HubSpot</div>
    <section class="bridge" id="paste">
      <h2>Let your agent talk to our agent directly</h2>
      <p>Just paste this link into your agent. Or press the button for a copyable connect prompt (card, MCP initialize, then chat).</p>
      <div class="paste">
        <code id="agent-url">${esc(publicUrl)}</code>
        <button class="btn" type="button" id="copy-url">Copy link</button>
        <button class="btn solid" type="button" id="copy-prompt">Copy connect prompt</button>
      </div>
    </section>
    <section class="stage" id="talk">
      <div class="panel">
        <div class="panel-h"><span>Agent chat</span><span><i class="dot"></i>connected</span></div>
        <div id="log"></div>
        <form class="chat" id="f">
          <input id="t" autocomplete="off" placeholder="Ask your agent something..."/>
          <button class="send" aria-label="Send">➤</button>
        </form>
      </div>
      <div class="panel side">
        <div class="panel-h">How agents connect</div>
        <h3>Same URL. Two faces.</h3>
        <ol>
          <li>A browser gets this site and the chat.</li>
          <li>An agent gets the JSON card at <code>/.well-known/agent-card.json</code>.</li>
          <li>Initialize MCP at <code>/mcp</code>, then POST <code>/chat</code>.</li>
          <li>Ask for apps by job. Do not invent slugs.</li>
        </ol>
      </div>
    </section>
    <footer>Public Composio apps agent · machines: ${esc(publicUrl)}/mcp</footer>
  </div>
  <div class="toast" id="toast">Copied</div>
  <script>
    const PROMPT = ${JSON.stringify(prompt)};
    const URL_TEXT = ${JSON.stringify(publicUrl)};
    const toast = (m) => {
      const el = document.getElementById("toast");
      el.textContent = m;
      el.classList.add("on");
      setTimeout(() => el.classList.remove("on"), 1400);
    };
    const copy = async (text, ok) => {
      try { await navigator.clipboard.writeText(text); toast(ok); }
      catch { toast("Copy failed"); }
    };
    document.getElementById("copy-url").onclick = () => copy(URL_TEXT, "Link copied");
    document.getElementById("copy-prompt").onclick = () => copy(PROMPT, "Prompt copied");
    const log = document.getElementById("log");
    const add = (cls, text) => {
      const d = document.createElement("div");
      d.className = "row " + cls;
      d.textContent = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    };
    const es = new EventSource("/live");
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      if (ev.t === "say") add(ev.from || "", (ev.from || "") + ": " + ev.text);
      if (ev.t === "reply") add("agent", ev.text || "");
    };
    document.getElementById("f").onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById("t");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      await fetch("/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    };
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Link: `<${publicUrl}/.well-known/agent-card.json>; rel="describedby"; type="application/json"`,
    },
  });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

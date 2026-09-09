import { connectPrompt } from "./card.ts";

/** Floating chat + A2A copy. Mounts after Next.js hydration so it is not wiped. */
export function floatingWidget(publicUrl: string, runId: string): string {
  const prompt = connectPrompt(publicUrl);
  const markup = widgetMarkup(publicUrl, runId);
  return `
<link rel="alternate" type="application/json" href="/agent.json"/>
<link rel="describedby" href="/.well-known/agent-card.json"/>
<script>
(() => {
  const MARKUP = ${JSON.stringify(markup)};
  const PROMPT = ${JSON.stringify(prompt)};
  const URL_TEXT = ${JSON.stringify(publicUrl)};
  const bind = () => {
    if (window.__waBound) return;
    const fab = document.getElementById("wa-fab");
    const panel = document.getElementById("wa-panel");
    if (!fab || !panel) return;
    window.__waBound = true;
    fab.onclick = () => {
      const open = panel.classList.toggle("open");
      fab.innerHTML = open ? CLOSE_ICON : OPEN_ICON;
      fab.classList.toggle("active", open);
    };
    const toast = (m) => {
      const el = document.getElementById("wa-toast");
      if (!el) return;
      el.textContent = m; el.classList.add("on");
      setTimeout(() => el.classList.remove("on"), 1800);
    };
    const fallbackCopy = (text) => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove();
      if (!ok) throw new Error("copy");
    };
    const copy = async (text, ok) => {
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
        else fallbackCopy(text);
        toast(ok);
      } catch {
        try { fallbackCopy(text); toast(ok); } catch { toast("Copy failed"); }
      }
    };
    const flash = (btn, label) => {
      const prev = btn.innerHTML; btn.textContent = label;
      setTimeout(() => { btn.innerHTML = prev; }, 1600);
    };
    document.getElementById("wa-copy-url").onclick = async (ev) => {
      await copy(URL_TEXT, "Link copied"); flash(ev.currentTarget, "✓ Copied");
    };
    document.getElementById("wa-copy-prompt").onclick = async (ev) => {
      await copy(PROMPT, "Prompt copied"); flash(ev.currentTarget, "✓ Copied");
    };
    const log = document.getElementById("wa-log");
    const md = (raw) => {
      let s = raw;
      s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const blocks = []; let buf = '', inCode = false, lang = '';
      for (const line of s.split('\\n')) {
        if (!inCode && line.startsWith('\`\`\`')) {
          if (buf.trim()) blocks.push({t:'md',v:buf}); buf = '';
          lang = line.slice(3).trim(); inCode = true; continue;
        }
        if (inCode && line.startsWith('\`\`\`')) {
          blocks.push({t:'code',v:buf,lang}); buf = ''; inCode = false; continue;
        }
        buf += line + '\\n';
      }
      if (buf.trim()) blocks.push(inCode ? {t:'code',v:buf,lang} : {t:'md',v:buf});
      return blocks.map(b => {
        if (b.t === 'code') {
          const header = b.lang ? '<div class=\"wa-code-lang\">' + b.lang + '</div>' : '';
          return '<div class=\"wa-code-wrap\">' + header +
            '<pre class=\"wa-code\"><code>' + b.v.replace(/\\n$/,'') + '</code></pre>' +
            '<button class=\"wa-code-copy\" onclick=\"(function(btn){var t=btn.parentNode.querySelector(\\'code\\').textContent;' +
            'try{navigator.clipboard?navigator.clipboard.writeText(t):document.execCommand(\\'copy\\');}catch(e){}' +
            'btn.textContent=\\'Copied\\';setTimeout(function(){btn.textContent=\\'Copy\\'},1200);})(this)\">Copy</button></div>';
        }
        let h = b.v;
        h = h.replace(/^### (.+)$/gm, '<h5 class=\"wa-md-h\">$1</h5>');
        h = h.replace(/^## (.+)$/gm, '<h4 class=\"wa-md-h\">$1</h4>');
        h = h.replace(/^# (.+)$/gm, '<h3 class=\"wa-md-h\">$1</h3>');
        h = h.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
        h = h.replace(/(<li>.*<\\/li>\\n?)+/gs, (m) => '<ul class=\"wa-md-ul\">' + m + '</ul>');
        h = h.replace(/^(\\d+)\\. (.+)$/gm, '<li>$2</li>');
        h = h.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
        h = h.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
        h = h.replace(/\`([^\`]+)\`/g, '<code class=\"wa-inline-code\">$1</code>');
        h = h.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href=\"$2\" target=\"_blank\" rel=\"noopener\" class=\"wa-md-link\">$1</a>');
        return h;
      }).join('');
    };
    const add = (cls, text) => {
      const d = document.createElement("div");
      d.className = "wa-msg " + cls;
      if (cls === 'agent') { d.innerHTML = md(text); }
      else { d.textContent = text; }
      log.appendChild(d); log.scrollTop = log.scrollHeight;
    };
    const es = new EventSource("/live");
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      if (ev.t === "say") add(ev.from || "human", (ev.from || "") + ": " + ev.text);
      if (ev.t === "reply") add("agent", ev.text || "");
    };
    document.getElementById("wa-form").onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById("wa-text");
      const text = input.value.trim();
      if (!text) return;
      add("human", text);
      input.value = "";
      await fetch("/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    };
  };
  const OPEN_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const CLOSE_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const mount = () => {
    if (!document.getElementById("wa-fab")) {
      window.__waBound = false;
      const wrap = document.createElement("div");
      wrap.id = "wa-root";
      wrap.innerHTML = MARKUP;
      document.body.appendChild(wrap);
      const panel = document.getElementById("wa-panel");
      const fab = document.getElementById("wa-fab");
      if (panel && fab) {
        panel.classList.add("open");
        fab.innerHTML = CLOSE_ICON;
        fab.classList.add("active");
      }
    }
    bind();
  };
  const start = () => { mount(); setInterval(mount, 1200); };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
</script>`;
}

function widgetMarkup(publicUrl: string, runId: string): string {
  return `
<style>
  @keyframes wa-slide-up {
    from { opacity: 0; transform: translateY(20px) scale(.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes wa-fab-in {
    from { opacity: 0; transform: scale(0); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes wa-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,.45); }
    50%      { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
  }

  .wa-fab, .wa-panel, .wa-toast {
    font-family: var(--font-geist-sans, ui-sans-serif), system-ui, -apple-system, sans-serif;
  }

  /* --- FAB button --- */
  .wa-fab {
    position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 2147483000;
    width: 3.5rem; height: 3.5rem; border-radius: 50%; border: 0; cursor: pointer;
    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%);
    color: #34d399; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 24px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08);
    transition: all .3s cubic-bezier(.4,0,.2,1);
    animation: wa-fab-in .4s cubic-bezier(.34,1.56,.64,1) both, wa-pulse 2.5s ease-in-out 1s infinite;
  }
  .wa-fab:hover {
    transform: scale(1.08);
    box-shadow: 0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(52,211,153,.3);
  }
  .wa-fab.active {
    background: linear-gradient(135deg, #1a1a2e 0%, #0f0f0f 100%);
    color: #fff; animation: none;
  }
  .wa-fab svg { width: 22px; height: 22px; }

  /* --- Panel --- */
  .wa-panel {
    position: fixed; right: 1.5rem; bottom: 5.8rem; z-index: 2147483000;
    width: min(30rem, calc(100vw - 2rem));
    height: min(70vh, calc(100vh - 7.5rem));
    background: #0f0f0f;
    color: #e5e5e5;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 20px;
    display: none; flex-direction: column; overflow: hidden;
    box-shadow: 0 25px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.05);
  }
  .wa-panel.open {
    display: flex;
    animation: wa-slide-up .35s cubic-bezier(.4,0,.2,1) both;
  }

  /* --- Header --- */
  .wa-hdr {
    padding: 1.1rem 1.25rem 1rem;
    background: linear-gradient(180deg, rgba(52,211,153,.06) 0%, transparent 100%);
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .wa-hdr-top {
    display: flex; align-items: center; gap: .6rem; margin-bottom: .5rem;
  }
  .wa-hdr-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 8px rgba(52,211,153,.5);
    flex-shrink: 0;
  }
  .wa-hdr-title {
    font-size: .95rem; font-weight: 600; color: #fff; letter-spacing: -.01em;
  }
  .wa-hdr-sub {
    font-size: .78rem; color: rgba(255,255,255,.45); line-height: 1.45; margin: 0;
  }

  /* --- A2A connect bar --- */
  .wa-a2a {
    display: flex; align-items: center; gap: .5rem;
    margin-top: .75rem; padding: .6rem .75rem;
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06);
    border-radius: 10px;
  }
  .wa-a2a-url {
    flex: 1; font-family: var(--font-jetbrains-mono, ui-monospace, monospace);
    font-size: .72rem; color: #34d399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    user-select: all;
  }
  .wa-a2a-btn {
    font-family: inherit; font-size: .7rem; font-weight: 500; letter-spacing: .02em;
    border: 1px solid rgba(255,255,255,.12); background: transparent; color: rgba(255,255,255,.7);
    padding: .35rem .65rem; border-radius: 8px; cursor: pointer;
    transition: all .2s ease; white-space: nowrap;
  }
  .wa-a2a-btn:hover { border-color: rgba(52,211,153,.4); color: #34d399; }
  .wa-a2a-btn.primary {
    background: #34d399; color: #0f0f0f; border-color: #34d399; font-weight: 600;
  }
  .wa-a2a-btn.primary:hover { background: #4ade80; border-color: #4ade80; }

  /* --- Status --- */
  .wa-status {
    display: flex; align-items: center; gap: .4rem;
    padding: .5rem 1.25rem;
    font-size: .7rem; letter-spacing: .04em; text-transform: uppercase;
    color: rgba(255,255,255,.35);
  }
  .wa-status-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #34d399;
    animation: wa-pulse 2s ease-in-out infinite;
  }

  /* --- Chat log --- */
  #wa-log {
    flex: 1; overflow-y: auto; padding: 1rem 1.25rem;
    scroll-behavior: smooth;
  }
  #wa-log::-webkit-scrollbar { width: 4px; }
  #wa-log::-webkit-scrollbar-track { background: transparent; }
  #wa-log::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }

  .wa-msg {
    margin: .5rem 0; padding: .6rem .85rem; border-radius: 12px;
    font-size: .88rem; line-height: 1.5; white-space: pre-wrap; max-width: 88%;
    animation: wa-slide-up .25s ease both;
  }
  .wa-msg.human {
    background: rgba(52,211,153,.1); color: #a7f3d0;
    border: 1px solid rgba(52,211,153,.15); margin-left: auto;
    border-bottom-right-radius: 4px;
  }
  .wa-msg.agent {
    background: rgba(255,255,255,.05); color: #e5e5e5;
    border: 1px solid rgba(255,255,255,.06);
    border-bottom-left-radius: 4px;
  }

  /* --- Markdown in messages --- */
  .wa-msg.agent { white-space: normal; }
  .wa-md-h { font-size: .92rem; font-weight: 600; color: #fff; margin: .6rem 0 .3rem; }
  .wa-md-h:first-child { margin-top: 0; }
  .wa-md-ul { margin: .3rem 0; padding-left: 1.2rem; list-style: disc; }
  .wa-md-ul li { margin: .15rem 0; line-height: 1.5; }
  .wa-inline-code {
    font-family: var(--font-jetbrains-mono, ui-monospace, monospace);
    font-size: .82em; background: rgba(255,255,255,.08); color: #34d399;
    padding: .1rem .35rem; border-radius: 4px; border: 1px solid rgba(255,255,255,.06);
  }
  .wa-code-wrap {
    position: relative; margin: .5rem 0; border-radius: 10px;
    background: rgba(0,0,0,.4); border: 1px solid rgba(255,255,255,.06);
    overflow: hidden;
  }
  .wa-code-lang {
    font-family: var(--font-jetbrains-mono, ui-monospace, monospace);
    font-size: .65rem; text-transform: uppercase; letter-spacing: .05em;
    color: rgba(255,255,255,.3); padding: .4rem .75rem .15rem;
    border-bottom: 1px solid rgba(255,255,255,.04);
  }
  .wa-code {
    margin: 0; padding: .6rem .75rem; overflow-x: auto;
    font-family: var(--font-jetbrains-mono, ui-monospace, monospace);
    font-size: .8rem; line-height: 1.55; color: #d4d4d4;
    tab-size: 2;
  }
  .wa-code code { font: inherit; color: inherit; }
  .wa-code-copy {
    position: absolute; top: .35rem; right: .35rem;
    font-family: inherit; font-size: .65rem; font-weight: 500;
    background: rgba(255,255,255,.08); color: rgba(255,255,255,.5);
    border: 1px solid rgba(255,255,255,.1); border-radius: 6px;
    padding: .2rem .5rem; cursor: pointer; transition: all .2s ease;
  }
  .wa-code-copy:hover { background: rgba(52,211,153,.15); color: #34d399; border-color: rgba(52,211,153,.3); }
  .wa-md-link { color: #34d399; text-decoration: underline; text-underline-offset: 2px; }
  .wa-md-link:hover { color: #4ade80; }
  .wa-msg.agent p { margin: .3rem 0; }
  .wa-msg.agent strong { color: #fff; }

  /* --- Welcome --- */
  .wa-welcome {
    text-align: center; padding: 2rem 1.5rem 1rem; color: rgba(255,255,255,.4);
  }
  .wa-welcome-icon {
    width: 48px; height: 48px; margin: 0 auto 1rem;
    border-radius: 14px; background: rgba(52,211,153,.08);
    border: 1px solid rgba(52,211,153,.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem;
  }
  .wa-welcome h4 {
    font-size: .9rem; color: rgba(255,255,255,.7); font-weight: 500; margin: 0 0 .4rem;
  }
  .wa-welcome p {
    font-size: .78rem; line-height: 1.5; margin: 0;
  }

  /* --- Input --- */
  .wa-input-bar {
    display: flex; align-items: center; gap: .5rem;
    padding: .75rem 1rem; border-top: 1px solid rgba(255,255,255,.06);
    background: rgba(255,255,255,.02);
  }
  .wa-input-bar input {
    flex: 1; background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.08); color: #fff;
    padding: .7rem 1rem; border-radius: 12px; outline: none;
    font: inherit; font-size: .88rem;
    transition: border-color .2s ease;
  }
  .wa-input-bar input:focus { border-color: rgba(52,211,153,.35); }
  .wa-input-bar input::placeholder { color: rgba(255,255,255,.25); }
  .wa-input-bar button {
    width: 2.5rem; height: 2.5rem; border-radius: 12px; border: 0;
    background: #34d399; color: #0f0f0f; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background .2s ease;
  }
  .wa-input-bar button:hover { background: #4ade80; }
  .wa-input-bar button svg { width: 18px; height: 18px; }

  /* --- Toast --- */
  .wa-toast {
    position: fixed; bottom: 6rem; right: 1.5rem; z-index: 2147483001;
    background: #34d399; color: #0f0f0f; font-weight: 600;
    padding: .5rem 1rem; border-radius: 10px; font-size: .78rem;
    opacity: 0; transform: translateY(8px);
    transition: all .25s ease;
    pointer-events: none;
  }
  .wa-toast.on { opacity: 1; transform: translateY(0); }

  /* --- Mobile --- */
  @media (max-width: 640px) {
    .wa-panel {
      right: 0; bottom: 0; left: 0;
      width: 100%; height: 100vh;
      border-radius: 0;
    }
    .wa-fab { right: 1rem; bottom: 1rem; }
  }
</style>
<button class="wa-fab" id="wa-fab" type="button" aria-label="Open agent chat">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
</button>
<div class="wa-panel" id="wa-panel" role="dialog" aria-label="Composio apps agent">
  <div class="wa-hdr">
    <div class="wa-hdr-top">
      <div class="wa-hdr-dot"></div>
      <span class="wa-hdr-title">Composio Agent</span>
    </div>
    <p class="wa-hdr-sub">Let your agent talk to ours — paste the link or copy the connect prompt. <span style="opacity:.3;font-size:.65rem">Run ${esc(runId)}</span></p>
    <div class="wa-a2a">
      <span class="wa-a2a-url" id="wa-url">${esc(publicUrl)}</span>
      <button class="wa-a2a-btn" type="button" id="wa-copy-url">Copy link</button>
      <button class="wa-a2a-btn primary" type="button" id="wa-copy-prompt">Connect prompt</button>
    </div>
  </div>
  <div class="wa-status"><div class="wa-status-dot"></div>Online · Ask which Composio app fits your use case</div>
  <div id="wa-log">
    <div class="wa-welcome">
      <div class="wa-welcome-icon">✦</div>
      <h4>Composio Apps Agent</h4>
      <p>Ask me which Composio integration fits your use case, or debug OAuth/auth issues.</p>
    </div>
  </div>
  <form class="wa-input-bar" id="wa-form">
    <input id="wa-text" autocomplete="off" placeholder="Ask about Composio integrations..."/>
    <button type="submit" aria-label="Send">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </button>
  </form>
</div>
<div class="wa-toast" id="wa-toast">Copied</div>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

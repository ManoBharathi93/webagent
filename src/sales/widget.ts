import { corgiConnectPrompt } from "./card.ts";

/** Floating chat widget for the Corgi insurance advisor. */
export function corgiWidget(publicUrl: string, runId: string): string {
  const prompt = corgiConnectPrompt(publicUrl);
  const markup = widgetMarkup(publicUrl, runId);
  return `
<link rel="alternate" type="text/plain" href="/llms.txt" title="How a peer agent should connect"/>
<link rel="alternate" type="application/json" href="/agent.json"/>
<link rel="describedby" href="/.well-known/agent-card.json"/>
<script>
(() => {
  const MARKUP = ${JSON.stringify(markup)};
  const PROMPT = ${JSON.stringify(prompt)};
  const bind = () => {
    if (window.__waBound) return;
    const fab = document.getElementById("wa-fab");
    const panel = document.getElementById("wa-panel");
    if (!fab || !panel) return;
    window.__waBound = true;
    const setOpen = (open) => {
      panel.classList.toggle("open", open);
      fab.innerHTML = open ? CLOSE_ICON : OPEN_ICON;
      fab.classList.toggle("active", open);
      fab.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    };
    fab.onclick = () => setOpen(!panel.classList.contains("open"));
    const closeBtn = document.getElementById("wa-close");
    if (closeBtn) closeBtn.onclick = () => setOpen(false);
    const fallbackCopy = (text) => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove();
      if (!ok) throw new Error("copy");
    };
    const copy = async (text) => {
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
        else fallbackCopy(text);
      } catch {
        try { fallbackCopy(text); } catch {}
      }
    };
    const flash = (btn) => {
      const prev = btn.textContent; btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = prev; }, 1400);
    };
    const copyBtn = document.getElementById("wa-copy-prompt");
    if (copyBtn) copyBtn.onclick = async (ev) => {
      await copy(PROMPT); flash(ev.currentTarget);
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
          const header = b.lang ? '<div class="wa-code-lang">' + b.lang + '</div>' : '';
          return '<div class="wa-code-wrap">' + header +
            '<pre class="wa-code"><code>' + b.v.replace(/\\n$/,'') + '</code></pre></div>';
        }
        let h = b.v;
        h = h.replace(/^### (.+)$/gm, '<h5 class="wa-md-h">$1</h5>');
        h = h.replace(/^## (.+)$/gm, '<h4 class="wa-md-h">$1</h4>');
        h = h.replace(/^# (.+)$/gm, '<h3 class="wa-md-h">$1</h3>');
        h = h.replace(/\\*\\*\\[HIGH\\]\\*\\*/g, '<span class="risk-high">HIGH</span>');
        h = h.replace(/\\*\\*\\[MEDIUM\\]\\*\\*/g, '<span class="risk-med">MEDIUM</span>');
        h = h.replace(/\\*\\*\\[LOW\\]\\*\\*/g, '<span class="risk-low">LOW</span>');
        h = h.replace(/\\[HIGH\\]/g, '<span class="risk-high">HIGH</span>');
        h = h.replace(/\\[MEDIUM\\]/g, '<span class="risk-med">MEDIUM</span>');
        h = h.replace(/\\[LOW\\]/g, '<span class="risk-low">LOW</span>');
        h = h.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
        h = h.replace(/(<li>.*<\\/li>\\n?)+/gs, (m) => '<ul class="wa-md-ul">' + m + '</ul>');
        h = h.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
        h = h.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
        h = h.replace(/\`([^\`]+)\`/g, '<code class="wa-inline-code">$1</code>');
        h = h.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" rel="noopener" class="wa-md-link">$1</a>');
        return h;
      }).join('');
    };
    const add = (cls, text) => {
      const welcome = document.getElementById("wa-welcome");
      if (welcome) welcome.remove();
      const d = document.createElement("div");
      d.className = "wa-msg " + cls;
      if (cls === 'agent') { d.innerHTML = md(text); }
      else { d.textContent = text; }
      log.appendChild(d); log.scrollTop = log.scrollHeight;
    };
    let lastUserText = '';
    if (!window.__waSession) {
      window.__waSession = (crypto.randomUUID && crypto.randomUUID()) || ("c" + Date.now());
    }
    const session = window.__waSession;
    if (!window.__waEs) {
      window.__waEs = new EventSource("/live?session=" + encodeURIComponent(session));
    }
    window.__waEs.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      if (ev.t === "say" && ev.from === "human") {
        if (ev.text === lastUserText) return;
      }
      if (ev.t === "say") add(ev.from || "human", ev.text || "");
      if (ev.t === "reply") add("agent", ev.text || "");
    };
    const form = document.getElementById("wa-form");
    const input = document.getElementById("wa-text");
    const chipWrap = document.getElementById("wa-chips");
    const send = async () => {
      const text = input.value.trim();
      if (!text) return;
      lastUserText = text;
      add("human", text);
      input.value = "";
      if (chipWrap) chipWrap.remove();
      await fetch("/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, session }),
      });
    };
    let composing = false;
    input.addEventListener("compositionstart", () => { composing = true; });
    input.addEventListener("compositionend", () => { composing = false; });
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (composing) return;
      await send();
    };
    input.addEventListener("keydown", (e) => {
      if (e.shiftKey || e.isComposing || e.keyCode === 229 || composing) return;
      const enter = e.key === "Enter" || e.key === "Return" || e.code === "Enter" || e.code === "NumpadEnter" || e.keyCode === 13;
      if (!enter) return;
      e.preventDefault();
      send();
    });
    if (chipWrap) {
      chipWrap.querySelectorAll(".wa-chip").forEach(chip => {
        chip.onclick = () => {
          input.value = chip.dataset.q || chip.textContent;
          send();
        };
      });
    }
  };
  const OPEN_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const CLOSE_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
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
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes wa-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  #wa-root, #wa-root * { box-sizing: border-box; }
  #wa-root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wa-fab {
    position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 2147483000;
    width: 3rem; height: 3rem; border-radius: 50%; border: 0; cursor: pointer;
    background: #1e3a5f; color: #93c5fd;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 12px rgba(0,0,0,.4), 0 0 0 1px rgba(147,197,253,.15);
    transition: all .2s ease;
  }
  .wa-fab:hover { color: #fff; box-shadow: 0 4px 20px rgba(30,58,95,.6), 0 0 0 1px rgba(147,197,253,.25); }
  .wa-fab.active { color: #64748b; }
  .wa-fab svg { width: 18px; height: 18px; }
  .wa-panel {
    position: fixed; right: 1.25rem; bottom: 5rem; z-index: 2147483000;
    width: min(42rem, 70vw, calc(100vw - 1.5rem));
    height: min(80vh, calc(100vh - 6.5rem));
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid rgba(147,197,253,.12);
    border-radius: 16px;
    display: none; flex-direction: column; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.6);
  }
  .wa-panel.open { display: flex; animation: wa-slide-up .25s ease both; }
  .wa-hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding: .875rem 1rem;
    border-bottom: 1px solid rgba(147,197,253,.08);
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    flex-shrink: 0;
  }
  .wa-hdr-left { display: flex; align-items: center; gap: .5rem; }
  .wa-hdr-icon {
    width: 28px; height: 28px; border-radius: 8px;
    background: #1e3a5f; border: 1px solid rgba(147,197,253,.15);
    display: flex; align-items: center; justify-content: center;
    font-size: .75rem; color: #60a5fa;
  }
  .wa-hdr-title { font-size: .875rem; font-weight: 600; color: #f1f5f9; }
  .wa-hdr-sub { font-size: .7rem; color: #64748b; margin-left: .25rem; }
  .wa-hdr-actions { display: flex; gap: .25rem; }
  .wa-hdr-btn {
    background: none; border: 0; color: #94a3b8; cursor: pointer;
    width: 2.25rem; height: 2.25rem; padding: 0; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: color .15s, background .15s;
  }
  .wa-hdr-btn:hover { color: #f1f5f9; background: rgba(147,197,253,.08); }
  .wa-hdr-btn svg { width: 18px; height: 18px; }
  .wa-a2a {
    padding: .75rem 1rem;
    border-bottom: 1px solid rgba(147,197,253,.06);
    flex-shrink: 0;
  }
  .wa-a2a-headline {
    font-size: .8rem; font-weight: 600; color: #f1f5f9; margin: 0 0 .5rem;
  }
  .wa-a2a-headline em { font-style: normal; color: #60a5fa; }
  .wa-a2a-row { display: flex; align-items: center; gap: .5rem; }
  .wa-a2a-prompt {
    flex: 1; font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: .75rem; color: #94a3b8; background: #1e293b;
    border: 1px solid rgba(147,197,253,.08); border-radius: 8px;
    padding: .45rem .65rem; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; user-select: all; cursor: text;
  }
  .wa-a2a-copy {
    font-size: .7rem; font-weight: 600; color: #0f172a;
    background: #60a5fa; border: 0; border-radius: 8px;
    padding: .45rem .75rem; cursor: pointer;
    transition: background .15s; white-space: nowrap; flex-shrink: 0;
  }
  .wa-a2a-copy:hover { background: #93c5fd; }
  #wa-log {
    flex: 1; overflow-y: auto; padding: 1.25rem 1rem;
    scroll-behavior: smooth;
    display: flex; flex-direction: column; gap: .75rem;
  }
  #wa-log::-webkit-scrollbar { width: 3px; }
  #wa-log::-webkit-scrollbar-track { background: transparent; }
  #wa-log::-webkit-scrollbar-thumb { background: rgba(147,197,253,.1); border-radius: 2px; }
  .wa-msg {
    font-size: .9rem; line-height: 1.65; max-width: 92%;
    animation: wa-fade-in .2s ease both;
  }
  .wa-msg.human {
    color: #f1f5f9; margin-left: auto;
    background: #1e3a5f; padding: .625rem .875rem; border-radius: 14px 14px 4px 14px;
  }
  .wa-msg.agent { color: #cbd5e1; padding: .25rem 0; }
  .wa-msg.agent { white-space: normal; }
  .wa-md-h { font-size: .9rem; font-weight: 600; color: #f1f5f9; margin: .75rem 0 .25rem; }
  .wa-md-h:first-child { margin-top: 0; }
  .wa-md-ul { margin: .25rem 0; padding-left: 1.25rem; list-style: disc; color: #94a3b8; }
  .wa-md-ul li { margin: .1rem 0; line-height: 1.6; color: #cbd5e1; }
  .wa-inline-code {
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: .82em; background: rgba(147,197,253,.1); color: #e2e8f0;
    padding: .1rem .35rem; border-radius: 4px;
  }
  .wa-code-wrap {
    position: relative; margin: .5rem 0; border-radius: 8px;
    background: #1e293b; border: 1px solid rgba(147,197,253,.08);
    overflow: hidden;
  }
  .wa-code { margin: 0; padding: .6rem .75rem; overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: .8rem; line-height: 1.55; color: #cbd5e1; tab-size: 2;
  }
  .wa-code code { font: inherit; color: inherit; }
  .wa-md-link { color: #60a5fa; text-decoration: underline; text-underline-offset: 2px; }
  .wa-md-link:hover { color: #93c5fd; }
  .wa-msg.agent strong { color: #f1f5f9; }
  .risk-high { color: #ef4444; font-weight: 700; font-size: .8rem; }
  .risk-med { color: #f59e0b; font-weight: 700; font-size: .8rem; }
  .risk-low { color: #22c55e; font-weight: 700; font-size: .8rem; }
  .wa-welcome {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 2rem 1.5rem; text-align: center;
  }
  .wa-welcome-icon {
    width: 48px; height: 48px; margin-bottom: .75rem;
    border-radius: 12px; background: #1e3a5f;
    border: 1px solid rgba(147,197,253,.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.3rem; color: #60a5fa;
  }
  .wa-welcome h4 { font-size: 1rem; color: #f1f5f9; font-weight: 600; margin: 0 0 .35rem; }
  .wa-welcome p {
    font-size: .8rem; line-height: 1.55; color: #64748b; margin: 0 0 1rem; max-width: 22rem;
  }
  #wa-chips {
    display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; max-width: 24rem;
  }
  .wa-chip {
    font-size: .75rem; color: #93c5fd; background: rgba(96,165,250,.1);
    border: 1px solid rgba(96,165,250,.2); border-radius: 20px;
    padding: .4rem .75rem; cursor: pointer; transition: all .15s;
    white-space: nowrap;
  }
  .wa-chip:hover { background: rgba(96,165,250,.2); color: #bfdbfe; border-color: rgba(96,165,250,.35); }
  .wa-input-wrap {
    padding: .75rem; border-top: 1px solid rgba(147,197,253,.06); flex-shrink: 0;
  }
  .wa-input-box {
    display: flex; align-items: flex-end;
    background: #1e293b; border: 1px solid rgba(147,197,253,.1);
    border-radius: 12px; overflow: hidden;
    transition: border-color .2s;
  }
  .wa-input-box:focus-within { border-color: rgba(96,165,250,.3); }
  .wa-input-box input {
    flex: 1; background: transparent; border: 0; color: #f1f5f9;
    padding: .75rem .875rem; outline: none;
    font: inherit; font-size: .875rem; line-height: 1.5;
    min-height: 2.75rem;
  }
  .wa-input-box input::placeholder { color: #475569; }
  .wa-input-box button {
    width: 2.25rem; height: 2.25rem; margin: .25rem .25rem .25rem 0;
    border-radius: 8px; border: 0;
    background: transparent; color: #475569; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: color .15s, background .15s; flex-shrink: 0;
  }
  .wa-input-box button:hover { color: #60a5fa; background: rgba(96,165,250,.1); }
  .wa-input-box button svg { width: 16px; height: 16px; }
  .wa-run-id { display: none; }
  @media (max-width: 640px) {
    .wa-panel {
      right: 0; bottom: 0; left: 0; top: 0;
      width: 100%; height: 100%;
      border-radius: 0; border: 0;
    }
    .wa-fab { right: .75rem; bottom: .75rem; }
  }
</style>
<button class="wa-fab" id="wa-fab" type="button" aria-label="Open chat">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
</button>
<div class="wa-panel" id="wa-panel" role="dialog" aria-label="Corgi insurance advisor">
  <div class="wa-hdr">
    <div class="wa-hdr-left">
      <div class="wa-hdr-icon">🐶</div>
      <span class="wa-hdr-title">Corgi</span>
      <span class="wa-hdr-sub">Insurance Advisor</span>
    </div>
    <div class="wa-hdr-actions">
      <button class="wa-hdr-btn" id="wa-close" type="button" aria-label="Close chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  </div>
  <div class="wa-a2a">
    <p class="wa-a2a-headline">Let your agent get an <em>insurance assessment</em>:</p>
    <div class="wa-a2a-row">
      <span class="wa-a2a-prompt" id="wa-url">${esc(publicUrl)}</span>
      <button class="wa-a2a-copy" type="button" id="wa-copy-prompt">Copy prompt</button>
    </div>
  </div>
  <div id="wa-log">
    <div class="wa-welcome" id="wa-welcome">
      <div class="wa-welcome-icon">🐶</div>
      <h4>Corgi Insurance Advisor</h4>
      <p>Tell me about your startup and I will assess your specific risks, estimate their likelihood, and recommend the right coverage with a cost estimate.</p>
      <div id="wa-chips">
        <button class="wa-chip" data-q="We are a seed-stage SaaS startup building B2B analytics">Seed SaaS startup</button>
        <button class="wa-chip" data-q="We are an AI startup building LLM agents, just raised our seed round">AI / LLM startup</button>
        <button class="wa-chip" data-q="We are a fintech startup processing payments for SMBs">Fintech startup</button>
        <button class="wa-chip" data-q="We are a health-tech startup handling patient data">Health-tech startup</button>
        <button class="wa-chip" data-q="What information do I need for a Corgi quote?">How to get a quote</button>
      </div>
    </div>
  </div>
  <div class="wa-input-wrap">
    <form class="wa-input-box" id="wa-form">
      <input id="wa-text" type="text" placeholder="Tell me about your startup..." autocomplete="off" enterkeyhint="send"/>
      <button type="submit" aria-label="Send">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/></svg>
      </button>
    </form>
  </div>
  <span class="wa-run-id">${esc(runId)}</span>
</div>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

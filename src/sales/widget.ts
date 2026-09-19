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
    font-family: Geist, "f37Bolton", ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #191919;
  }
  .wa-fab {
    position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 2147483000;
    width: 3.25rem; height: 3.25rem; border-radius: 50%; border: 0; cursor: pointer;
    background: #FF5C00; color: #fff;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(255,92,0,.28);
    transition: transform .15s ease, background .15s ease;
  }
  .wa-fab:hover { background: #FF7D33; transform: translateY(-1px); }
  .wa-fab.active { background: #191919; box-shadow: 0 8px 24px rgba(25,25,25,.18); }
  .wa-fab svg { width: 18px; height: 18px; }
  .wa-panel {
    position: fixed; right: 1.25rem; bottom: 5.25rem; z-index: 2147483000;
    width: min(42rem, 70vw, calc(100vw - 1.5rem));
    height: min(80vh, calc(100vh - 6.5rem));
    background: #FDFBF6;
    color: #191919;
    border: 1px solid #E8E4DC;
    border-radius: 18px;
    display: none; flex-direction: column; overflow: hidden;
    box-shadow: 0 24px 60px rgba(25,25,25,.14);
  }
  .wa-panel.open { display: flex; animation: wa-slide-up .25s ease both; }
  .wa-hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding: .9rem 1rem;
    border-bottom: 1px solid #E8E4DC;
    background: #FDFBF6;
    flex-shrink: 0;
  }
  .wa-hdr-left { display: flex; align-items: center; gap: .55rem; }
  .wa-hdr-icon {
    width: 28px; height: 28px; border-radius: 8px;
    background: #fff; border: 1px solid #E8E4DC;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .wa-hdr-icon img { width: 18px; height: 18px; object-fit: contain; }
  .wa-hdr-title { font-size: .9rem; font-weight: 700; color: #191919; letter-spacing: -.02em; }
  .wa-hdr-sub { font-size: .7rem; color: #7B7B7B; margin-left: .15rem; }
  .wa-hdr-actions { display: flex; gap: .25rem; }
  .wa-hdr-btn {
    background: none; border: 0; color: #4E4E4E; cursor: pointer;
    width: 2.25rem; height: 2.25rem; padding: 0; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    transition: color .15s, background .15s;
  }
  .wa-hdr-btn:hover { color: #191919; background: #F3EEE6; }
  .wa-hdr-btn svg { width: 18px; height: 18px; }
  .wa-a2a {
    padding: .75rem 1rem;
    border-bottom: 1px solid #E8E4DC;
    background: #fff;
    flex-shrink: 0;
  }
  .wa-a2a-headline {
    font-size: .8rem; font-weight: 600; color: #191919; margin: 0 0 .5rem;
  }
  .wa-a2a-headline em { font-style: normal; color: #FF5C00; }
  .wa-a2a-row { display: flex; align-items: center; gap: .5rem; }
  .wa-a2a-prompt {
    flex: 1; font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: .75rem; color: #4E4E4E; background: #FDFBF6;
    border: 1px solid #E8E4DC; border-radius: 10px;
    padding: .45rem .65rem; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; user-select: all; cursor: text;
  }
  .wa-a2a-copy {
    font-size: .7rem; font-weight: 700; color: #fff;
    background: #FF5C00; border: 0; border-radius: 999px;
    padding: .45rem .8rem; cursor: pointer;
    transition: background .15s; white-space: nowrap; flex-shrink: 0;
  }
  .wa-a2a-copy:hover { background: #FF7D33; }
  #wa-log {
    flex: 1; overflow-y: auto; padding: 1.25rem 1rem;
    scroll-behavior: smooth;
    display: flex; flex-direction: column; gap: .75rem;
    background: #FDFBF6;
  }
  #wa-log::-webkit-scrollbar { width: 3px; }
  #wa-log::-webkit-scrollbar-track { background: transparent; }
  #wa-log::-webkit-scrollbar-thumb { background: #E8E4DC; border-radius: 2px; }
  .wa-msg {
    font-size: .9rem; line-height: 1.65; max-width: 92%;
    animation: wa-fade-in .2s ease both;
  }
  .wa-msg.human {
    color: #fff; margin-left: auto;
    background: #191919; padding: .625rem .875rem; border-radius: 14px 14px 4px 14px;
  }
  .wa-msg.agent { color: #2c2c2c; padding: .25rem 0; white-space: normal; }
  .wa-md-h { font-family: georgia, serif; font-size: 1rem; font-weight: 400; color: #191919; margin: .75rem 0 .25rem; }
  .wa-md-h:first-child { margin-top: 0; }
  .wa-md-ul { margin: .25rem 0; padding-left: 1.25rem; list-style: disc; color: #4E4E4E; }
  .wa-md-ul li { margin: .1rem 0; line-height: 1.6; color: #2c2c2c; }
  .wa-inline-code {
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: .82em; background: #F3EEE6; color: #191919;
    padding: .1rem .35rem; border-radius: 4px;
  }
  .wa-code-wrap {
    position: relative; margin: .5rem 0; border-radius: 10px;
    background: #fff; border: 1px solid #E8E4DC;
    overflow: hidden;
  }
  .wa-code { margin: 0; padding: .6rem .75rem; overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: .8rem; line-height: 1.55; color: #2c2c2c; tab-size: 2;
  }
  .wa-code code { font: inherit; color: inherit; }
  .wa-md-link { color: #FF5C00; text-decoration: underline; text-underline-offset: 2px; }
  .wa-md-link:hover { color: #b84200; }
  .wa-msg.agent strong { color: #191919; }
  .risk-high { color: #cc4a00; font-weight: 700; font-size: .8rem; }
  .risk-med { color: #FF5C00; font-weight: 700; font-size: .8rem; }
  .risk-low { color: #2a7a3a; font-weight: 700; font-size: .8rem; }
  .wa-welcome {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 2rem 1.5rem; text-align: center;
  }
  .wa-welcome-icon {
    width: 48px; height: 48px; margin-bottom: .75rem;
    border-radius: 12px; background: #fff;
    border: 1px solid #E8E4DC;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .wa-welcome-icon img { width: 28px; height: 28px; object-fit: contain; }
  .wa-welcome h4 { font-family: georgia, serif; font-size: 1.15rem; color: #191919; font-weight: 400; margin: 0 0 .35rem; }
  .wa-welcome p {
    font-size: .8rem; line-height: 1.55; color: #7B7B7B; margin: 0 0 1rem; max-width: 22rem;
  }
  #wa-chips {
    display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; max-width: 24rem;
  }
  .wa-chip {
    font-size: .75rem; color: #191919; background: #fff;
    border: 1px solid #E8E4DC; border-radius: 999px;
    padding: .4rem .75rem; cursor: pointer; transition: all .15s;
    white-space: nowrap;
  }
  .wa-chip:hover { border-color: #FF5C00; color: #FF5C00; }
  .wa-input-wrap {
    padding: .75rem; border-top: 1px solid #E8E4DC; flex-shrink: 0; background: #fff;
  }
  .wa-input-box {
    display: flex; align-items: flex-end;
    background: #FDFBF6; border: 1px solid #E8E4DC;
    border-radius: 14px; overflow: hidden;
    transition: border-color .2s;
  }
  .wa-input-box:focus-within { border-color: #191919; }
  .wa-input-box input {
    flex: 1; background: transparent; border: 0; color: #191919;
    padding: .75rem .875rem; outline: none;
    font: inherit; font-size: .875rem; line-height: 1.5;
    min-height: 2.75rem;
  }
  .wa-input-box input::placeholder { color: #9d9d9d; }
  .wa-input-box button {
    width: 2.25rem; height: 2.25rem; margin: .25rem .25rem .25rem 0;
    border-radius: 999px; border: 0;
    background: #FF5C00; color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s; flex-shrink: 0;
  }
  .wa-input-box button:hover { background: #FF7D33; }
  .wa-input-box button svg { width: 14px; height: 14px; }
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
      <div class="wa-hdr-icon"><img src="/images/corgi logo vector.svg" alt=""/></div>
      <span class="wa-hdr-title">Corgi</span>
      <span class="wa-hdr-sub">Insurance advisor</span>
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
      <div class="wa-welcome-icon"><img src="/images/corgi logo vector.svg" alt=""/></div>
      <h4>Business insurance, quoted in minutes.</h4>
      <p>Tell me what your startup does. I’ll map the risks, estimate likelihood, and recommend the Corgi package that fits — with a cost band from the site.</p>
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

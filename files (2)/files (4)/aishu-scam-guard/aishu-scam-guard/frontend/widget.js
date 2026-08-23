/* ==========================================================================
   Ishu AI · Scam Guard — Embeddable Chat Widget
   Usage:
     <link rel="stylesheet" href="widget.css">
     <script src="widget.js"></script>
     <script>
       Ishu.init({ apiBase: "http://localhost:8000" });
     </script>
   ========================================================================== */

(function (global) {
  "use strict";

  /* ------------------------------------------------------------------
     SVG ICONS
  ------------------------------------------------------------------ */

  const SEND_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11.5L20.5 3 13 20.5l-2.4-6.6L3 11.5z"/></svg>`;

  const CLIP_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>`;

  const YT_SVG = `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
  </svg>`;

  const WA_SVG = `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.3.2-.6.1-1.7-.9-2.8-1.6-3.9-3.5-.3-.5.3-.5.9-1.6.1-.2 0-.4-.1-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4C7.3 7.2 6.5 8 6.5 9.6c0 1.6 1.2 3.2 1.3 3.4 1.2 1.8 2.6 3.1 4.1 3.8 2.4 1 3.3.7 3.9.7.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.7-.4zm-5.5 7.5C5 21.9.1 17 .1 11 .1 5 5 .1 12 .1c7 0 11.9 4.9 11.9 10.9 0 6-4.9 10.9-11.9 10.9-2 0-3.9-.5-5.5-1.5L1 23l2.1-4.5A10.8 10.8 0 012 12C2 6.5 6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/>
  </svg>`;

  const CLOSE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;

  /* ------------------------------------------------------------------
     INLINE AVATAR (SVG data URI — works offline, no external image needed)
  ------------------------------------------------------------------ */
  const AVATAR_URI = [
    "data:image/svg+xml,",
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">` +
      `<defs>` +
      `<radialGradient id="g1" cx="50%" cy="40%" r="55%">` +
      `<stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.25"/>` +
      `<stop offset="100%" stop-color="#050c1a"/>` +
      `</radialGradient>` +
      `</defs>` +
      `<rect width="80" height="80" fill="#050c1a"/>` +
      `<ellipse cx="40" cy="38" rx="28" ry="30" fill="url(#g1)"/>` +
      `<circle cx="40" cy="28" r="14" fill="#111f38" stroke="#2dd4bf" stroke-width="1.5"/>` +
      `<circle cx="33" cy="25" r="4.5" fill="#2dd4bf" opacity="0.9"/>` +
      `<circle cx="47" cy="25" r="4.5" fill="#2dd4bf" opacity="0.9"/>` +
      `<circle cx="33" cy="25" r="1.8" fill="#050c1a"/>` +
      `<circle cx="47" cy="25" r="1.8" fill="#050c1a"/>` +
      `<path d="M34 34 Q40 39 46 34" stroke="#2dd4bf" stroke-width="2" fill="none" stroke-linecap="round"/>` +
      `<path d="M20 30 Q10 28 12 38" stroke="#7c9bff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>` +
      `<path d="M60 30 Q70 28 68 38" stroke="#7c9bff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>` +
      `<ellipse cx="40" cy="60" rx="20" ry="15" fill="#111f38" stroke="#7c9bff" stroke-width="1.2"/>` +
      `<path d="M10 58 Q20 48 30 55" stroke="#7c9bff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.5"/>` +
      `<path d="M70 58 Q60 48 50 55" stroke="#7c9bff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.5"/>` +
      `</svg>`
    )
  ].join("");

  /* ------------------------------------------------------------------
     CHANNEL DEFINITIONS
  ------------------------------------------------------------------ */
  const CHANNELS = [
    { key: "email",    label: "Email" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "sms",      label: "SMS" },
    { key: "call",     label: "Call" },
  ];

  /* ------------------------------------------------------------------
     STATE
  ------------------------------------------------------------------ */
  const state = {
    apiBase:      "http://localhost:8000",
    open:         false,
    channel:      "other",
    history:      [],
    sending:      false,
    pendingFile:  null,
    gmailEnabled: true,
    sendBtnEl:    null,
  };

  /* ------------------------------------------------------------------
     HELPERS
  ------------------------------------------------------------------ */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls)              e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function verdictClass(v) {
    if (!v) return "";
    const s = v.toLowerCase();
    if (s.includes("scam"))       return "scam";
    if (s.includes("suspicious")) return "suspicious";
    if (s.includes("legit"))      return "legit";
    return "";
  }

  function cleanBody(reply) {
    return (reply || "")
      .replace(/VERDICT:.*(\n|$)/g, "")
      .replace(/CONFIDENCE:.*(\n|$)/g, "")
      .replace(/RED FLAGS:[\s\S]*?(WHY:|$)/, "$1")
      .trim();
  }

  function setSending(on) {
    state.sending = on;
    if (state.sendBtnEl) state.sendBtnEl.disabled = on;
  }

  function scrollBottom(msgEl) {
    msgEl.scrollTop = msgEl.scrollHeight;
  }

  /* ------------------------------------------------------------------
     RENDER: BOT MESSAGE
  ------------------------------------------------------------------ */
  function renderBot(data) {
    const row = el("div", "ishu-row ishu-bot");

    const av  = el("div", "ishu-msg-av");
    av.innerHTML = `<img src="${AVATAR_URI}" alt="Ishu"/>`;

    const bub = el("div", "ishu-bubble");

    if (data.verdict) {
      const badge = el("div", `ishu-verdict ${verdictClass(data.verdict)}`);
      badge.textContent = `⚠ ${data.verdict}${data.confidence ? " · " + data.confidence : ""}`;
      bub.appendChild(badge);
    }

    bub.appendChild(
      el("div", null, esc(cleanBody(data.reply)).replace(/\n/g, "<br>"))
    );

    if (data.red_flags && data.red_flags.length) {
      const ul = el("ul", "ishu-flags");
      data.red_flags.forEach(f => ul.appendChild(el("li", null, esc(f))));
      bub.appendChild(ul);
    }

    row.appendChild(av);
    row.appendChild(bub);
    return row;
  }

  /* ------------------------------------------------------------------
     RENDER: USER MESSAGE
  ------------------------------------------------------------------ */
  function renderUser(text, fileLabel) {
    const row = el("div", "ishu-row ishu-user");
    const bub = el("div", "ishu-bubble");
    if (fileLabel) bub.appendChild(el("div", "ishu-file-chip", `📎 ${esc(fileLabel)}`));
    if (text)      bub.appendChild(el("div", null, esc(text)));
    row.appendChild(bub);
    return row;
  }

  /* ------------------------------------------------------------------
     TYPING INDICATOR
  ------------------------------------------------------------------ */
  function addTyping(msgEl) {
    const row = el("div", "ishu-row ishu-bot");
    row.id = "ishu-typing-row";
    const av = el("div", "ishu-msg-av");
    av.innerHTML = `<img src="${AVATAR_URI}" alt="Ishu"/>`;
    const bub = el("div", "ishu-bubble");
    bub.innerHTML = `<div class="ishu-typing"><span></span><span></span><span></span></div>`;
    row.appendChild(av);
    row.appendChild(bub);
    msgEl.appendChild(row);
    scrollBottom(msgEl);
  }

  function removeTyping() {
    const r = document.getElementById("ishu-typing-row");
    if (r) r.remove();
  }

  /* ------------------------------------------------------------------
     SEND TEXT MESSAGE
  ------------------------------------------------------------------ */
  async function sendMessage(text, msgEl) {
    if (!text.trim() || state.sending) return;
    setSending(true);
    msgEl.appendChild(renderUser(text));
    addTyping(msgEl);

    try {
      const res = await fetch(`${state.apiBase}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: text, history: state.history, channel: state.channel }),
      });
      removeTyping();
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        msgEl.appendChild(renderBot({ reply: err.detail || "Something went wrong reaching Ishu AI." }));
      } else {
        const data = await res.json();
        state.history.push({ role: "user",      content: text });
        state.history.push({ role: "assistant", content: data.reply });
        msgEl.appendChild(renderBot(data));
      }
    } catch {
      removeTyping();
      msgEl.appendChild(renderBot({
        reply: `⚠ Can't reach backend at ${state.apiBase}.\nMake sure the backend is running:\n  python -m uvicorn main:app --port 8000`,
      }));
    } finally {
      setSending(false);
      scrollBottom(msgEl);
    }
  }

  /* ------------------------------------------------------------------
     SEND FILE
  ------------------------------------------------------------------ */
  async function sendFile(file, note, msgEl) {
    if (state.sending) return;
    setSending(true);
    msgEl.appendChild(renderUser(note, file.name));
    addTyping(msgEl);

    const form = new FormData();
    form.append("file",    file);
    form.append("channel", state.channel);

    try {
      const res = await fetch(`${state.apiBase}/api/analyze-file?channel=${encodeURIComponent(state.channel)}`, {
        method: "POST",
        body:   form,
      });
      removeTyping();
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        msgEl.appendChild(renderBot({ reply: err.detail || "Couldn't analyze that file." }));
      } else {
        msgEl.appendChild(renderBot(await res.json()));
      }
    } catch {
      removeTyping();
      msgEl.appendChild(renderBot({ reply: `⚠ Network error reaching ${state.apiBase}.` }));
    } finally {
      setSending(false);
      scrollBottom(msgEl);
    }
  }

  /* ------------------------------------------------------------------
     GMAIL SCAN
  ------------------------------------------------------------------ */
  async function scanGmail(msgEl) {
    if (state.sending) return;
    setSending(true);
    addTyping(msgEl);

    try {
      const status = await fetch(`${state.apiBase}/api/gmail/status`).then(r => r.json());

      if (!status.connected) {
        removeTyping();
        const row = el("div", "ishu-row ishu-bot");
        const av  = el("div", "ishu-msg-av");
        av.innerHTML = `<img src="${AVATAR_URI}" alt="Ishu"/>`;
        const bub = el("div", "ishu-bubble");
        bub.innerHTML = `Gmail isn't connected yet.<br><br><a href="${state.apiBase}/api/gmail/login" target="_blank" style="color:#2dd4bf;font-weight:600">Connect Gmail →</a>`;
        row.appendChild(av); row.appendChild(bub);
        msgEl.appendChild(row);
        return;
      }

      const res = await fetch(`${state.apiBase}/api/gmail/scan?max_results=10`);
      removeTyping();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        msgEl.appendChild(renderBot({ reply: err.detail || "Couldn't scan Gmail." }));
      } else {
        const items = await res.json();
        const row = el("div", "ishu-row ishu-bot");
        const av  = el("div", "ishu-msg-av");
        av.innerHTML = `<img src="${AVATAR_URI}" alt="Ishu"/>`;
        const bub = el("div", "ishu-bubble");
        bub.appendChild(el("div", null, `📥 Scanned your last ${items.length} emails:`));

        const list = el("div", "ishu-inbox-list");
        items.forEach(item => {
          const card = el("div", "ishu-inbox-card");
          if (item.verdict) {
            const b = el("div", `ishu-verdict ${verdictClass(item.verdict)}`);
            b.textContent = `⚠ ${item.verdict}`;
            card.appendChild(b);
          }
          card.appendChild(el("div", "ishu-inbox-subj",   esc(item.subject)));
          card.appendChild(el("div", "ishu-inbox-sender", esc(item.sender)));
          if (item.why) card.appendChild(el("div", null, esc(item.why)));
          list.appendChild(card);
        });

        bub.appendChild(list);
        row.appendChild(av); row.appendChild(bub);
        msgEl.appendChild(row);
      }
    } catch {
      removeTyping();
      msgEl.appendChild(renderBot({ reply: `⚠ Network error reaching ${state.apiBase}.` }));
    } finally {
      setSending(false);
      scrollBottom(msgEl);
    }
  }

  /* ------------------------------------------------------------------
     BUILD WIDGET
  ------------------------------------------------------------------ */
  function buildWidget() {
    /* ── Root ── */
    const root = el("div");
    root.id = "ishu-root";

    /* ── Launcher bubble ── */
    const launcher = el("div");
    launcher.id = "ishu-launcher";
    launcher.setAttribute("role", "button");
    launcher.setAttribute("aria-label", "Chat with Ishu AI");
    launcher.innerHTML = `
      <img class="ishu-launch-avatar" src="${AVATAR_URI}" alt="Ishu AI"/>
      <span class="ishu-online-dot"></span>
    `;

    /* ── Panel ── */
    const panel = el("div");
    panel.id = "ishu-panel";

    /* ── Header ── */
    const header = el("div");
    header.id = "ishu-header";
    header.innerHTML = `
      <div class="ishu-hdr-avatar">
        <img src="${AVATAR_URI}" alt="Ishu"/>
      </div>
      <div class="ishu-hdr-info">
        <div class="ishu-hdr-name">Ishu AI · Scam Guard</div>
        <div class="ishu-hdr-status">Online — Ready to protect you</div>
      </div>
      <a class="ishu-hdr-btn yt"    href="https://www.youtube.com"    target="_blank" rel="noopener" title="Open YouTube">${YT_SVG}</a>
      <a class="ishu-hdr-btn wa"    href="https://web.whatsapp.com"   target="_blank" rel="noopener" title="Open WhatsApp">${WA_SVG}</a>
      <button class="ishu-hdr-btn close" aria-label="Close">${CLOSE_SVG}</button>
    `;

    /* ── Quick launch bar ── */
    const quickbar = el("div");
    quickbar.id = "ishu-quickbar";
    quickbar.innerHTML = `
      <a class="ishu-quick-btn youtube" href="https://www.youtube.com" target="_blank" rel="noopener">
        ${YT_SVG} YouTube
      </a>
      <a class="ishu-quick-btn whatsapp" href="https://web.whatsapp.com" target="_blank" rel="noopener">
        ${WA_SVG} WhatsApp
      </a>
    `;

    /* ── Channel chips ── */
    const channelsEl = el("div");
    channelsEl.id = "ishu-channels";

    CHANNELS.forEach(c => {
      const chip = el("button", "ishu-chip", c.label);
      chip.type = "button";
      chip.addEventListener("click", () => {
        state.channel = state.channel === c.key ? "other" : c.key;
        channelsEl.querySelectorAll(".ishu-chip:not(.ishu-gmail-chip)").forEach(ch => ch.classList.remove("ishu-active"));
        if (state.channel === c.key) chip.classList.add("ishu-active");
      });
      channelsEl.appendChild(chip);
    });

    if (state.gmailEnabled) {
      const gmailChip = el("button", "ishu-chip ishu-gmail-chip", "📥 Scan Gmail");
      gmailChip.type = "button";
      gmailChip.addEventListener("click", () => scanGmail(messages));
      channelsEl.appendChild(gmailChip);
    }

    /* ── Messages ── */
    const messages = el("div");
    messages.id = "ishu-messages";

    /* Greeting */
    messages.appendChild(renderBot({
      reply:
        "Hi! I'm Ishu 👋✨\n\nI'm your AI Scam Guard — protecting you from fake job offers, phishing emails, and WhatsApp scams.\n\n🔍 Paste any suspicious message\n📎 Attach a PDF or screenshot\n📥 Tap \"Scan Gmail\" to check your inbox",
    }));

    /* ── Attachment bar ── */
    const attachBar  = el("div");
    attachBar.id     = "ishu-attach-bar";
    const attachName = el("span", null, "📎 file");
    const clearBtn   = el("button", null, "✕");
    clearBtn.type    = "button";
    attachBar.appendChild(attachName);
    attachBar.appendChild(clearBtn);

    /* ── Input bar ── */
    const inputbar = el("div");
    inputbar.id    = "ishu-inputbar";

    const fileInput  = el("input");
    fileInput.type   = "file";
    fileInput.accept = ".pdf,image/png,image/jpeg,image/jpg";
    fileInput.style.display = "none";

    const attachBtn = el("button", null, CLIP_SVG);
    attachBtn.id    = "ishu-attach-btn";
    attachBtn.type  = "button";
    attachBtn.title = "Attach PDF or screenshot";

    const textarea        = el("textarea");
    textarea.id           = "ishu-input";
    textarea.placeholder  = "Paste a suspicious message here…";
    textarea.rows         = 1;

    const sendBtn = el("button", null, SEND_SVG);
    sendBtn.id    = "ishu-send";
    sendBtn.type  = "button";
    state.sendBtnEl = sendBtn;

    inputbar.appendChild(attachBtn);
    inputbar.appendChild(textarea);
    inputbar.appendChild(sendBtn);

    const footnote = el(
      "div", null,
      "Ishu AI can make mistakes · Never pay money to secure a job · cybercrime.gov.in"
    );
    footnote.id = "ishu-footnote";

    /* ── Assemble panel ── */
    panel.appendChild(header);
    panel.appendChild(quickbar);
    panel.appendChild(channelsEl);
    panel.appendChild(messages);
    panel.appendChild(attachBar);
    panel.appendChild(inputbar);
    panel.appendChild(footnote);

    root.appendChild(launcher);
    root.appendChild(panel);
    root.appendChild(fileInput);
    document.body.appendChild(root);

    /* ── Wire events ── */

    // Open / close
    launcher.addEventListener("click", () => {
      state.open = !state.open;
      panel.classList.toggle("ishu-open", state.open);
      if (state.open) textarea.focus();
    });

    header.querySelector(".close").addEventListener("click", () => {
      state.open = false;
      panel.classList.remove("ishu-open");
    });

    // Attach file
    attachBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      const f = fileInput.files[0];
      if (!f) return;
      state.pendingFile = f;
      attachName.textContent = `📎 ${f.name}`;
      attachBar.classList.add("ishu-show");
    });

    clearBtn.addEventListener("click", () => {
      state.pendingFile = null;
      fileInput.value   = "";
      attachBar.classList.remove("ishu-show");
    });

    // Submit
    function submit() {
      const text = textarea.value.trim();
      const file = state.pendingFile;

      if (file) {
        sendFile(file, text, messages);
        state.pendingFile = null;
        fileInput.value   = "";
        attachBar.classList.remove("ishu-show");
        textarea.value      = "";
        textarea.style.height = "auto";
        return;
      }
      if (!text) return;
      textarea.value      = "";
      textarea.style.height = "auto";
      sendMessage(text, messages);
    }

    sendBtn.addEventListener("click", submit);

    textarea.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    });

    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 90) + "px";
    });
  }

  /* ------------------------------------------------------------------
     PUBLIC API
  ------------------------------------------------------------------ */
  const IshuWidget = {
    init(opts = {}) {
      if (opts.apiBase)        state.apiBase      = opts.apiBase.replace(/\/$/, "");
      if (opts.gmail === false) state.gmailEnabled = false;
      if (document.getElementById("ishu-root")) return; // already mounted
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildWidget);
      } else {
        buildWidget();
      }
    },
  };

  global.Ishu = IshuWidget;

  /* Backward-compat alias so old embed snippets using Aishu.init() still work */
  global.Aishu = IshuWidget;

})(window);

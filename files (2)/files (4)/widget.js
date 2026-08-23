/* ==========================================================================
   Aishu Scam Guard — 3D Cute Anime Girl Character Widget
   ========================================================================== */

(function (global) {
  "use strict";

  // Active online anime 3D model
  const MODEL_3D_URL = "https://models.readyplayer.me/64b73b5f928a306497eb6d9d.glb";

  const CUTE_GIRL_AVATAR_SVG = `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <circle cx="24" cy="24" r="22" fill="#FCE7F3" stroke="#F472B6" stroke-width="2"/>
      <path d="M12 26c0 10 4 15 12 15s12-5 12-15c0-10-5-17-12-17S12 16 12 26z" fill="#9333EA"/>
      <ellipse cx="24" cy="25" rx="9" ry="10" fill="#FFE4E6"/>
      <path d="M15 20c3 3 6 1 9 1s6 2 9-1c-2-7-6-10-9-10s-7 3-9 10z" fill="#A855F7"/>
      <ellipse cx="20.5" cy="24.5" rx="1.8" ry="2.2" fill="#1E1B4B"/>
      <circle cx="21" cy="23.8" r="0.8" fill="#FFFFFF"/>
      <ellipse cx="27.5" cy="24.5" rx="1.8" ry="2.2" fill="#1E1B4B"/>
      <circle cx="28" cy="23.8" r="0.8" fill="#FFFFFF"/>
      <circle cx="18.5" cy="27.5" r="1.5" fill="#FDA4AF"/>
      <circle cx="29.5" cy="27.5" r="1.5" fill="#FDA4AF"/>
      <path d="M22.5 28.5q1.5 1.5 3 0" stroke="#E11D48" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`;

  const SEND_SVG = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 11.5L20.5 3 13 20.5l-2.4-6.6L3 11.5z" fill="#0B1220"/>
    </svg>`;

  const CLIP_SVG = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.5 8.5l-8 8a3 3 0 104.2 4.2l8-8a5 5 0 10-7-7l-8 8a7 7 0 109.9 9.9"
            stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const CHANNELS = [
    { key: "email", label: "Email" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "sms", label: "SMS" },
    { key: "call", label: "Call transcript" },
  ];

  const state = {
    apiBase: "http://localhost:8000",
    open: false,
    channel: "other",
    history: [],
    sending: false,
    pendingFile: null,
    gmailEnabled: true,
  };

  function injectMascotStyles() {
    if (document.getElementById("aishu-mascot-styles")) return;
    const style = document.createElement("style");
    style.id = "aishu-mascot-styles";
    style.innerHTML = `
      #aishu-launcher {
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        width: 140px !important;
        height: 180px !important;
        padding: 0 !important;
        cursor: pointer;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        position: fixed;
        bottom: 8px;
        right: 8px;
      }
      .aishu-3d-wrap {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5));
      }
      model-viewer.aishu-3d-model {
        width: 100%;
        height: 100%;
        --poster-color: transparent;
        outline: none;
        cursor: pointer;
      }
      .aishu-mascot-bubble {
        position: absolute;
        top: 6px;
        right: 6px;
        background: #0f172a;
        color: #f472b6;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 11px;
        border-radius: 12px;
        border: 1px solid rgba(244, 114, 182, 0.4);
        white-space: nowrap;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      #aishu-launcher.aishu-active .aishu-mascot-bubble {
        display: none;
      }
      .aishu-avatar {
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function verdictClass(v) {
    if (!v) return "";
    const s = v.toLowerCase();
    if (s.includes("scam")) return "scam";
    if (s.includes("suspicious")) return "suspicious";
    if (s.includes("legit")) return "legit";
    return "";
  }

  function verdictBadge(verdict, confidence) {
    return el(
      "div",
      `aishu-verdict ${verdictClass(verdict)}`,
      `⚠ ${verdict}${confidence ? " · " + confidence + " confidence" : ""}`
    );
  }

  function cleanReplyBody(reply) {
    return (reply || "")
      .replace(/VERDICT:.*(\n|$)/g, "")
      .replace(/CONFIDENCE:.*(\n|$)/g, "")
      .replace(/RED FLAGS:[\s\S]*?(WHY:|$)/, "$1")
      .trim();
  }

  function renderBotMessage(data) {
    const wrap = el("div", "aishu-msg aishu-bot");
    const bubble = el("div", "aishu-bubble");

    if (data.verdict) bubble.appendChild(verdictBadge(data.verdict, data.confidence));
    bubble.appendChild(el("div", null, escapeHtml(cleanReplyBody(data.reply)).replace(/\n/g, "<br>")));

    if (data.red_flags && data.red_flags.length) {
      const ul = el("ul", "aishu-flags");
      data.red_flags.forEach((f) => ul.appendChild(el("li", null, escapeHtml(f))));
      bubble.appendChild(ul);
    }

    wrap.appendChild(bubble);
    return wrap;
  }

  function renderUserMessage(text, fileLabel) {
    const wrap = el("div", "aishu-msg aishu-user");
    const bubble = el("div", "aishu-bubble");
    if (fileLabel) {
      bubble.appendChild(el("div", "aishu-file-chip", `📎 ${escapeHtml(fileLabel)}`));
    }
    if (text) bubble.appendChild(el("div", null, escapeHtml(text)));
    wrap.appendChild(bubble);
    return wrap;
  }

  function typingIndicator() {
    const wrap = el("div", "aishu-msg aishu-bot");
    wrap.id = "aishu-typing-row";
    const bubble = el("div", "aishu-bubble");
    bubble.appendChild(el("div", "aishu-typing", "<span></span><span></span><span></span>"));
    wrap.appendChild(bubble);
    return wrap;
  }

  function removeTyping() {
    const row = document.getElementById("aishu-typing-row");
    if (row) row.remove();
  }

  async function sendMessage(text, messagesEl) {
    if (!text.trim() || state.sending) return;
    state.sending = true;
    setSending(true);

    messagesEl.appendChild(renderUserMessage(text));
    messagesEl.appendChild(typingIndicator());
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const res = await fetch(`${state.apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: state.history, channel: state.channel }),
      });
      removeTyping();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        messagesEl.appendChild(renderBotMessage({ reply: err.detail || "Something went wrong reaching Aishu." }));
      } else {
        const data = await res.json();
        state.history.push({ role: "user", content: text });
        state.history.push({ role: "assistant", content: data.reply });
        messagesEl.appendChild(renderBotMessage(data));
      }
    } catch (e) {
      removeTyping();
      messagesEl.appendChild(renderBotMessage({ reply: `Network error reaching ${state.apiBase}. Is the backend running?` }));
    } finally {
      state.sending = false;
      setSending(false);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  async function sendFile(file, note, messagesEl) {
    if (state.sending) return;
    state.sending = true;
    setSending(true);

    messagesEl.appendChild(renderUserMessage(note, file.name));
    messagesEl.appendChild(typingIndicator());
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const form = new FormData();
    form.append("file", file);
    form.append("channel", state.channel);

    try {
      const res = await fetch(`${state.apiBase}/api/analyze-file?channel=${encodeURIComponent(state.channel)}`, {
        method: "POST",
        body: form,
      });
      removeTyping();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        messagesEl.appendChild(renderBotMessage({ reply: err.detail || "Couldn't analyze that file." }));
      } else {
        const data = await res.json();
        messagesEl.appendChild(renderBotMessage(data));
      }
    } catch (e) {
      removeTyping();
      messagesEl.appendChild(renderBotMessage({ reply: `Network error reaching ${state.apiBase}. Is the backend running?` }));
    } finally {
      state.sending = false;
      setSending(false);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function renderInboxResults(items, messagesEl) {
    const wrap = el("div", "aishu-msg aishu-bot");
    const bubble = el("div", "aishu-bubble");
    bubble.appendChild(el("div", null, `Scanned your last ${items.length} emails:`));

    const list = el("div", "aishu-inbox-list");
    items.forEach((item) => {
      const card = el("div", "aishu-inbox-item");
      if (item.verdict) card.appendChild(verdictBadge(item.verdict, item.confidence));
      card.appendChild(el("div", "aishu-inbox-subject", escapeHtml(item.subject)));
      card.appendChild(el("div", "aishu-inbox-sender", escapeHtml(item.sender)));
      if (item.why) card.appendChild(el("div", null, escapeHtml(item.why)));
      list.appendChild(card);
    });
    bubble.appendChild(list);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
  }

  async function scanGmail(messagesEl) {
    if (state.sending) return;
    state.sending = true;
    setSending(true);
    messagesEl.appendChild(typingIndicator());
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const status = await fetch(`${state.apiBase}/api/gmail/status`).then((r) => r.json());
      if (!status.connected) {
        removeTyping();
        const wrap = el("div", "aishu-msg aishu-bot");
        const bubble = el("div", "aishu-bubble");
        bubble.appendChild(el("div", null, "Gmail isn't connected yet. Click below to sign in:"));
        const link = el("a", null, "Connect Gmail →");
        link.href = `${state.apiBase}/api/gmail/login`;
        link.target = "_blank";
        link.style.color = "#F472B6";
        link.style.fontWeight = "600";
        bubble.appendChild(link);
        wrap.appendChild(bubble);
        messagesEl.appendChild(wrap);
        return;
      }

      const res = await fetch(`${state.apiBase}/api/gmail/scan?max_results=10`);
      removeTyping();
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        messagesEl.appendChild(renderBotMessage({ reply: err.detail || "Couldn't scan Gmail." }));
      } else {
        const items = await res.json();
        renderInboxResults(items, messagesEl);
      }
    } catch (e) {
      removeTyping();
      messagesEl.appendChild(renderBotMessage({ reply: `Network error reaching ${state.apiBase}.` }));
    } finally {
      state.sending = false;
      setSending(false);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  let sendBtnRef = null;
  function setSending(isSending) {
    if (sendBtnRef) sendBtnRef.disabled = isSending;
  }

  function buildWidget() {
    injectMascotStyles();

    const root = el("div");
    root.id = "aishu-root";

    const launcher = el("div");
    launcher.id = "aishu-launcher";
    launcher.innerHTML = `
      <div class="aishu-3d-wrap">
        <span class="aishu-mascot-bubble">Hi! Ask Aishu ✨</span>
        <model-viewer 
          src="${MODEL_3D_URL}" 
          alt="Aishu 3D Mascot"
          camera-orbit="0deg 80deg 110%"
          camera-target="0m 1.25m 0m"
          field-of-view="32deg"
          auto-rotate
          rotation-per-second="16deg"
          disable-zoom
          disable-pan
          shadow-intensity="1"
          class="aishu-3d-model">
        </model-viewer>
      </div>
    `;
    launcher.setAttribute("role", "button");
    launcher.setAttribute("aria-label", "Open Aishu scam checker chat");

    const panel = el("div");
    panel.id = "aishu-panel";

    const header = el("div");
    header.id = "aishu-header";
    header.innerHTML = `
      <div class="aishu-avatar">${CUTE_GIRL_AVATAR_SVG}</div>
      <div class="aishu-titles">
        <div class="aishu-title">Aishu · Scam Guard ✨</div>
        <div class="aishu-subtitle">Paste, attach, or scan your inbox</div>
      </div>
      <button class="aishu-close" aria-label="Close">✕</button>`;

    const channels = el("div");
    channels.id = "aishu-channels";
    CHANNELS.forEach((c) => {
      const chip = el("button", "aishu-chip", c.label);
      chip.type = "button";
      chip.addEventListener("click", () => {
        state.channel = state.channel === c.key ? "other" : c.key;
        [...channels.querySelectorAll(".aishu-chip:not(.aishu-gmail)")].forEach((ch) =>
          ch.classList.remove("aishu-active")
        );
        if (state.channel === c.key) chip.classList.add("aishu-active");
      });
      channels.appendChild(chip);
    });

    if (state.gmailEnabled) {
      const gmailChip = el("button", "aishu-chip aishu-gmail", "📥 Scan Gmail");
      gmailChip.type = "button";
      gmailChip.addEventListener("click", () => scanGmail(messages));
      channels.appendChild(gmailChip);
    }

    const messages = el("div");
    messages.id = "aishu-messages";
    messages.appendChild(
      renderBotMessage({
        reply:
          "Hi, I'm Aishu ✨ Paste a message, attach a PDF offer letter or a screenshot, or tap \"Scan Gmail\" to check your recent inbox for job/internship scam red flags.",
      })
    );

    const attachment = el("div");
    attachment.id = "aishu-attachment";

    const inputbar = el("div");
    inputbar.id = "aishu-inputbar";

    const fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf,image/png,image/jpeg,image/jpg";
    fileInput.style.display = "none";

    const attachBtn = el("button", null, CLIP_SVG);
    attachBtn.id = "aishu-attach-btn";
    attachBtn.type = "button";
    attachBtn.title = "Attach a PDF or screenshot";
    attachBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      const f = fileInput.files[0];
      if (!f) return;
      state.pendingFile = f;
      attachment.innerHTML = "";
      attachment.appendChild(el("span", null, `📎 ${escapeHtml(f.name)}`));
      const clearBtn = el("button", null, "✕");
      clearBtn.type = "button";
      clearBtn.addEventListener("click", () => {
        state.pendingFile = null;
        fileInput.value = "";
        attachment.classList.remove("aishu-show");
      });
      attachment.appendChild(clearBtn);
      attachment.classList.add("aishu-show");
    });

    const textarea = el("textarea");
    textarea.id = "aishu-input";
    textarea.placeholder = "Paste the message here, or attach a file...";
    textarea.rows = 1;

    const sendBtn = el("button");
    sendBtn.id = "aishu-send";
    sendBtn.innerHTML = SEND_SVG;
    sendBtn.type = "button";
    sendBtnRef = sendBtn;

    inputbar.appendChild(attachBtn);
    inputbar.appendChild(textarea);
    inputbar.appendChild(sendBtn);

    const footnote = el("div", null, "Aishu can make mistakes. Never pay money to secure a job offer.");
    footnote.id = "aishu-footnote";

    panel.appendChild(header);
    panel.appendChild(channels);
    panel.appendChild(messages);
    panel.appendChild(attachment);
    panel.appendChild(inputbar);
    panel.appendChild(footnote);

    root.appendChild(launcher);
    root.appendChild(panel);
    root.appendChild(fileInput);
    document.body.appendChild(root);

    launcher.addEventListener("click", () => {
      state.open = !state.open;
      panel.classList.toggle("aishu-open", state.open);
      launcher.classList.toggle("aishu-active", state.open);
      if (state.open) textarea.focus();
    });

    header.querySelector(".aishu-close").addEventListener("click", () => {
      state.open = false;
      panel.classList.remove("aishu-open");
      launcher.classList.remove("aishu-active");
    });

    function submit() {
      const text = textarea.value.trim();
      const file = state.pendingFile;

      if (file) {
        sendFile(file, text, messages);
        state.pendingFile = null;
        fileInput.value = "";
        attachment.classList.remove("aishu-show");
        textarea.value = "";
        textarea.style.height = "auto";
        return;
      }
      if (!text) return;
      textarea.value = "";
      textarea.style.height = "auto";
      sendMessage(text, messages);
    }

    sendBtn.addEventListener("click", submit);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 90) + "px";
    });
  }

  const Aishu = {
    init(opts = {}) {
      if (opts.apiBase) state.apiBase = opts.apiBase.replace(/\/$/, "");
      if (opts.gmail === false) state.gmailEnabled = false;
      if (document.getElementById("aishu-root")) return;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildWidget);
      } else {
        buildWidget();
      }
    },
  };

  global.Aishu = Aishu;
})(window);
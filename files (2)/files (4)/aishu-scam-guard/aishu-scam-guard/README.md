# Aishu Scam Guard 🤖🛡️

A chat widget you drop into your existing website to help visitors spot
**fake internship / job scams** — by pasting a message, attaching a
**PDF offer letter or a screenshot**, or scanning their **Gmail inbox**
directly. Everything runs through a **locally-hosted Ollama model** — no
message content goes to a third-party cloud.

---

## What it does

| Input | How |
|---|---|
| Pasted text (email/WhatsApp/SMS copy-paste) | `POST /api/chat` |
| PDF offer letter | `POST /api/analyze-file` — text extracted with `pdfplumber` |
| Screenshot (WhatsApp/SMS/email) | `POST /api/analyze-file` — text extracted with OCR (`pytesseract`) |
| Gmail inbox | `GET /api/gmail/scan` — real OAuth connection, reads recent mail read-only |

All four paths feed into **one shared scam-detection prompt** in
`backend/main.py`, so the verdict logic lives in exactly one place. Every
result comes back as:

```
VERDICT: LIKELY SCAM | SUSPICIOUS | LOOKS LEGITIMATE
CONFIDENCE: Low | Medium | High
RED FLAGS: ...
WHY: ...
WHAT TO DO: ...
```

## Project structure

```
aishu-scam-guard/
├── backend/
│   ├── main.py              FastAPI app: /api/chat, /api/analyze-file, /api/gmail/*
│   ├── gmail_service.py     Gmail OAuth + inbox fetch helper
│   └── requirements.txt
└── frontend/
    ├── widget.js             Embeddable chat widget (vanilla JS, no build step)
    ├── widget.css            Widget styling
    └── EMBED_SNIPPET.html    Copy-paste block for your existing site
```

There's no demo landing page — since you already have a website, just embed
`widget.js` + `widget.css` directly into it (see below).

## 1. Run the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

**Screenshot OCR** needs the Tesseract binary installed separately (it's not
a Python package):
- Windows: install from https://github.com/UB-Mannheim/tesseract/wiki and
  make sure `tesseract.exe` is on your PATH (or set
  `pytesseract.pytesseract.tesseract_cmd` in `gmail_service.py`/`main.py` to
  its full path).

Start Ollama and the backend:
```bash
ollama pull llama3.2      # or any model you've pulled — edit OLLAMA_MODEL in main.py
ollama serve
uvicorn main:app --reload --port 8000
```
Check `http://localhost:8000/health` → `{"status":"ok"}`.

## 2. Enable Gmail direct access (optional but requested)

Gmail is the only channel with a real, free, read-only API for personal
accounts — that's why it's the one wired up for direct access. WhatsApp and
SMS don't have an equivalent free API for personal numbers (WhatsApp
requires Meta's paid/approved Business API; SMS would need a Twilio number).
For those two, the **attach a screenshot** flow above is the practical
stand-in — paste a message or attach a screenshot from either app and Aishu
analyzes it the same way.

To connect Gmail:
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → Library** → enable **Gmail API**.
3. **APIs & Services → OAuth consent screen** → External → add your own
   Google account as a test user (test mode is fine for a hackathon demo).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → Application type **Web application** → Authorized redirect URI:
   `http://localhost:8000/api/gmail/callback`
5. Download the JSON and save it as `backend/credentials.json` (already
   gitignored — never commit this file).
6. Restart the backend. In the widget, tap **"📥 Scan Gmail"** → it'll prompt
   you to connect the first time, then list recent emails with a scam
   verdict on each.

`backend/token.json` is created after you approve access and reused
automatically after that (also gitignored).

## 3. Embed the widget on your website

Add this near the end of `<body>` on any page (see
`frontend/EMBED_SNIPPET.html`):

```html
<link rel="stylesheet" href="/path/to/widget.css">
<script src="/path/to/widget.js"></script>
<script>
  Aishu.init({
    apiBase: "http://localhost:8000",   // your backend URL
    gmail: true                          // false to hide the Gmail chip
  });
</script>
```

That's it — the script injects its own floating launcher button and chat
panel; no other markup needed.

## What Aishu checks for

- Upfront "registration / training / security deposit" fees
- Unrealistic salary for the role described
- Urgency and pressure tactics
- Payment requests via personal UPI/bank transfer/gift cards/crypto
- Non-official email domains, WhatsApp-only interviews
- Requests for Aadhaar/PAN/bank details before any real offer
- Mass "work from home, earn ₹X/day" recruitment language
- Sender/caller identity mismatches

Full prompt logic is in `SYSTEM_PROMPT` inside `backend/main.py`.

## Hackathon notes / next steps

- [ ] Report-to-authority link (cybercrime.gov.in) for high-confidence scam verdicts
- [ ] WhatsApp: if you want live automation later, WhatsApp Cloud API
      (Meta, free tier, business-verified number) is the real path — bigger
      setup lift than Gmail, worth a "planned" slide rather than building
      it under hackathon time pressure
- [ ] SMS: same story via Twilio, if you get access to a number
- [ ] Small labeled dataset of real scam vs. legit offers to benchmark verdict accuracy
- [ ] Dockerize backend + Ollama for one-command demo setup

## Safety note

Aishu is a decision-support tool, not a guarantee — it can be wrong. Always
verify offers directly through a company's official careers page and never
pay money to accept a job or internship.

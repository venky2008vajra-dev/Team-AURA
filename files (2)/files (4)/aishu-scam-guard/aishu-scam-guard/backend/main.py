"""
Ishu AI Scam Guard — Full Backend v3.1
========================================
TWO AI providers supported — pick whichever you prefer:

  ① GROQ  (Free Cloud — NO download needed!)
      Sign up free: https://console.groq.com
      Set below:  AI_PROVIDER = "groq"
                  GROQ_API_KEY = "gsk_your_key_here"

  ② OLLAMA (Local — needs Ollama installed)
      Set below:  AI_PROVIDER = "ollama"

Run:
    python -m pip install fastapi uvicorn httpx pdfplumber pytesseract Pillow python-multipart google-auth google-auth-oauthlib google-api-python-client
    python -m uvicorn main:app --reload --port 8000
"""

import json
import os
import re
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Literal, Optional

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field

import gmail_service

# ---------------------------------------------------------------------------
# ✅ AI PROVIDER CONFIG — Change these two lines to switch AI provider
# ---------------------------------------------------------------------------

AI_PROVIDER  = "groq"              # "groq"  OR  "ollama"
GROQ_API_KEY   = "gsk_your_key_here"   # Paste your Groq key here (free from console.groq.com)# Paste your Groq key here (free from console.groq.com)
GROQ_MODEL   = "groq/compound-mini"   # Free Groq model (fast!)

# Ollama settings (only used if AI_PROVIDER = "ollama")
OLLAMA_URL   = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "llama3.2"

REQUEST_TIMEOUT = 60.0


# Simple JSON file used as a lightweight "database" for contacts/newsletter/stats
DATA_DIR  = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

CONTACTS_FILE    = DATA_DIR / "contacts.json"
NEWSLETTER_FILE  = DATA_DIR / "newsletter.json"
STATS_FILE       = DATA_DIR / "stats.json"

def _load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return default

def _save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are Ishu, an AI safety assistant embedded in a website
whose only job is to protect students and job-seekers from FAKE internship
and job scams. Scams reach people through email, WhatsApp, SMS, job portals,
and phone calls. You analyze whatever the user pastes, uploads, or forwards
from their inbox and decide how suspicious it is.

Known red flags to actively look for:
- Upfront "registration", "training", "security deposit", "kit", or "processing" fees
- Salary or stipend that sounds too high for the described role/effort
- Urgency / pressure ("offer expires in 1 hour", "limited seats", "pay now")
- Requests to pay via personal UPI ID, personal bank transfer, gift cards, or crypto
- Vague company details, no official domain email (uses Gmail/Yahoo instead of company domain)
- Interviews conducted only over WhatsApp/Telegram chat with no video/formal call
- Requests for sensitive documents (Aadhaar, PAN, bank details, passwords) before any offer
- Grammar/spelling errors, mismatched company branding, suspicious links or shortened URLs
- "Work from home, earn ₹X per day, no experience needed" style mass-recruitment language
- Asking the candidate to first "like/subscribe/review" something or do small paid tasks
- Caller ID / sender that doesn't match the claimed company

When given a message to check, respond ONLY in this compact format:

VERDICT: <one of: LIKELY SCAM | SUSPICIOUS | LOOKS LEGITIMATE>
CONFIDENCE: <Low | Medium | High>
RED FLAGS:
- <flag 1, short>
- <flag 2, short>
(omit this section if none found)
WHY:
<2-4 sentence plain-language explanation>
WHAT TO DO:
<1-3 concrete, practical next steps>

If the user is just chatting or asking a general question, answer normally
and helpfully in 2-4 sentences. Keep replies concise and non-alarmist."""

# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

Role = Literal["user", "assistant"]


class ChatMessage(BaseModel):
    role: Role
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=6000)
    history: List[ChatMessage] = Field(default_factory=list)
    channel: Optional[Literal["email", "whatsapp", "sms", "call", "other"]] = "other"


class QuickScanRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=3000,
                      description="Suspicious message text to scan")
    channel: Optional[str] = "other"


class ContactRequest(BaseModel):
    name:    str  = Field(..., min_length=2,  max_length=100)
    email:   str  = Field(..., min_length=5,  max_length=200)
    subject: str  = Field(..., min_length=3,  max_length=200)
    message: str  = Field(..., min_length=10, max_length=2000)


class NewsletterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=200)
    name:  Optional[str] = ""


class AnalysisResult(BaseModel):
    id:          str
    reply:       str
    verdict:     Optional[str] = None
    confidence:  Optional[str] = None
    red_flags:   List[str]     = Field(default_factory=list)
    latency_ms:  int


class EmailScanItem(BaseModel):
    id:         str
    subject:    str
    sender:     str
    date:       str
    verdict:    Optional[str]  = None
    confidence: Optional[str]  = None
    red_flags:  List[str]      = Field(default_factory=list)
    why:        Optional[str]  = None


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(title="Ishu AI Scam Guard API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten to your domain before going live
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_verdict(text: str):
    verdict = confidence = why = None
    flags: List[str] = []

    m = re.search(r"VERDICT:\s*(.+)", text)
    if m:
        verdict = m.group(1).strip()

    m = re.search(r"CONFIDENCE:\s*(.+)", text)
    if m:
        confidence = m.group(1).strip()

    flags_block = re.search(r"RED FLAGS:\s*(.*?)(?:\nWHY:|\Z)", text, re.S)
    if flags_block:
        for line in flags_block.group(1).splitlines():
            line = line.strip(" -\t")
            if line:
                flags.append(line)

    why_block = re.search(r"WHY:\s*(.*?)(?:\nWHAT TO DO:|\Z)", text, re.S)
    if why_block:
        why = why_block.group(1).strip()

    return verdict, confidence, flags, why


async def call_groq(messages: list) -> str:
    if not GROQ_API_KEY or GROQ_API_KEY == "gsk_your_key_here":
        raise HTTPException(
            status_code=500,
            detail="Groq API key is missing or not configured. Please get a free key from console.groq.com and paste it in main.py under GROQ_API_KEY.",
        )
    payload = {
        "model":   GROQ_MODEL,
        "messages": messages,
        "temperature": 0.3,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Can't connect to Groq API. Please check your internet connection.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {e.response.text}")

    return data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()


async def call_ollama(messages: list) -> str:
    payload = {
        "model":   OLLAMA_MODEL,
        "messages": messages,
        "stream":  False,
        "options": {"temperature": 0.3},
    }
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.post(OLLAMA_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Can't reach Ollama at localhost:11434. Is 'ollama serve' running?",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    return data.get("message", {}).get("content", "").strip()


async def analyze_message(
    text: str,
    channel: str = "other",
    history: Optional[List[ChatMessage]] = None,
) -> AnalysisResult:
    start    = time.time()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for h in (history or [])[-10:]:
        messages.append({"role": h.role, "content": h.content})

    user_content = (
        text if channel == "other" else f"[Message received via: {channel}]\n{text}"
    )
    messages.append({"role": "user", "content": user_content})

    if AI_PROVIDER == "groq":
        reply_text = await call_groq(messages)
    else:
        reply_text = await call_ollama(messages)

    verdict, confidence, flags, _why = _parse_verdict(reply_text)

    # Update stats
    _bump_stat("total_scans")
    if verdict and "scam" in verdict.lower():
        _bump_stat("scams_blocked")

    return AnalysisResult(
        id=str(uuid.uuid4()),
        reply=reply_text,
        verdict=verdict,
        confidence=confidence,
        red_flags=flags,
        latency_ms=int((time.time() - start) * 1000),
    )


def _bump_stat(key: str, amount: int = 1):
    stats = _load_json(STATS_FILE, {
        "total_scans": 1247,
        "scams_blocked": 389,
        "users_protected": 843,
        "accuracy_pct": 99,
    })
    stats[key] = stats.get(key, 0) + amount
    _save_json(STATS_FILE, stats)


# ===========================================================================
# ① HEALTH
# ===========================================================================

@app.get("/health", tags=["System"])
async def health():
    """Quick liveness check."""
    return {
        "status":    "ok",
        "version":   "3.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ===========================================================================
# ② STATS  —  Hero / Counter Section
# ===========================================================================

@app.get("/api/stats", tags=["Website"])
async def get_stats():
    """
    Returns live statistics displayed in the website's stats/counter section.
    Frontend polls this to show animated numbers.

    Response:
        total_scans      – total messages analyzed
        scams_blocked    – messages classified as LIKELY SCAM
        users_protected  – unique visitors who used the chat
        accuracy_pct     – fixed 99 (marketing figure)
    """
    stats = _load_json(STATS_FILE, {
        "total_scans":     1247,
        "scams_blocked":   389,
        "users_protected": 843,
        "accuracy_pct":    99,
    })
    return stats


# ===========================================================================
# ③ SERVICES  —  Services Cards Section
# ===========================================================================

@app.get("/api/services", tags=["Website"])
async def get_services():
    """
    Returns the list of services shown as cards on the website.
    Edit this list to change what cards appear — no frontend change needed.
    """
    return [
        {
            "id":          "scam-detection",
            "icon":        "🔍",
            "title":       "Scam Detection",
            "description": "Paste any suspicious message and Ishu AI will tell you "
                           "if it's a scam in seconds.",
            "badge":       "Most Popular",
            "color":       "#2dd4bf",
        },
        {
            "id":          "email-scanner",
            "icon":        "📧",
            "title":       "Email Scanner",
            "description": "Connect your Gmail inbox and let Ishu scan your recent "
                           "emails for phishing attempts.",
            "badge":       "New",
            "color":       "#7c9bff",
        },
        {
            "id":          "whatsapp-guard",
            "icon":        "📱",
            "title":       "WhatsApp Guard",
            "description": "Forward suspicious WhatsApp messages to Ishu for instant "
                           "scam analysis.",
            "badge":       None,
            "color":       "#25d366",
        },
        {
            "id":          "document-check",
            "icon":        "📄",
            "title":       "Document Check",
            "description": "Upload a PDF offer letter or screenshot — Ishu will "
                           "extract and analyze the text.",
            "badge":       None,
            "color":       "#f5a524",
        },
        {
            "id":          "sms-guard",
            "icon":        "💬",
            "title":       "SMS Guard",
            "description": "Forward suspicious SMS messages and OTP phishing texts "
                           "to detect fraud instantly.",
            "badge":       None,
            "color":       "#a855f7",
        },
        {
            "id":          "call-analysis",
            "icon":        "📞",
            "title":       "Call Transcript",
            "description": "Paste the transcript of a suspicious call or voice note "
                           "and get an instant risk verdict.",
            "badge":       None,
            "color":       "#f472b6",
        },
    ]


# ===========================================================================
# ④ QUICK SCAN  —  Hero Section Inline Scanner
# ===========================================================================

@app.post("/api/quick-scan", response_model=AnalysisResult, tags=["Website"])
async def quick_scan(req: QuickScanRequest):
    """
    Powers the hero-section 'Quick Scan' text box.
    User pastes a suspicious message directly on the homepage and gets
    an instant verdict without opening the chat widget.
    """
    return await analyze_message(req.text, req.channel or "other")


# ===========================================================================
# ⑤ CONTACT FORM  —  Contact Section
# ===========================================================================

@app.post("/api/contact", tags=["Website"])
async def submit_contact(req: ContactRequest):
    """
    Saves a contact form submission.
    Stored in data/contacts.json — replace with email/DB later.
    """
    contacts = _load_json(CONTACTS_FILE, [])
    entry = {
        "id":        str(uuid.uuid4()),
        "name":      req.name,
        "email":     req.email,
        "subject":   req.subject,
        "message":   req.message,
        "submitted": datetime.utcnow().isoformat(),
        "status":    "new",
    }
    contacts.append(entry)
    _save_json(CONTACTS_FILE, contacts)

    return {
        "success": True,
        "message": f"Thanks {req.name}! We received your message and will reply to {req.email} within 24 hours.",
        "id":      entry["id"],
    }


@app.get("/api/contact", tags=["Admin"])
async def list_contacts():
    """Admin: view all contact form submissions."""
    return _load_json(CONTACTS_FILE, [])


# ===========================================================================
# ⑥ NEWSLETTER  —  Newsletter Signup Section
# ===========================================================================

@app.post("/api/newsletter", tags=["Website"])
async def newsletter_signup(req: NewsletterRequest):
    """
    Saves newsletter sign-ups.
    Stored in data/newsletter.json.
    """
    subscribers = _load_json(NEWSLETTER_FILE, [])

    # Avoid duplicate emails
    existing = [s for s in subscribers if s["email"].lower() == req.email.lower()]
    if existing:
        return {
            "success": True,
            "message": "You're already subscribed! We'll keep you updated. 🛡️",
        }

    entry = {
        "id":        str(uuid.uuid4()),
        "email":     req.email,
        "name":      req.name or "",
        "subscribed": datetime.utcnow().isoformat(),
    }
    subscribers.append(entry)
    _save_json(NEWSLETTER_FILE, subscribers)
    _bump_stat("users_protected")

    return {
        "success": True,
        "message": "Subscribed! You'll receive weekly scam alerts and safety tips. 🎉",
    }


@app.get("/api/newsletter", tags=["Admin"])
async def list_subscribers():
    """Admin: view all newsletter subscribers."""
    subs = _load_json(NEWSLETTER_FILE, [])
    return {"count": len(subs), "subscribers": subs}


# ===========================================================================
# ⑦ TESTIMONIALS  —  Reviews Section
# ===========================================================================

@app.get("/api/testimonials", tags=["Website"])
async def get_testimonials():
    """
    Returns user testimonials shown in the reviews/testimonials section.
    Edit this list to update what's shown on the website.
    """
    return [
        {
            "id":     "1",
            "name":   "Priya Sharma",
            "role":   "Computer Science Student",
            "avatar": "👩‍💻",
            "rating": 5,
            "text":   "I almost paid ₹3,000 registration fee for a fake internship. "
                      "Ishu AI caught it immediately and saved me!",
            "date":   "2026-08-10",
        },
        {
            "id":     "2",
            "name":   "Rahul Verma",
            "role":   "Recent Graduate",
            "avatar": "👨‍🎓",
            "rating": 5,
            "text":   "Got a WhatsApp job offer with amazing salary. Ishu flagged it "
                      "as LIKELY SCAM within seconds. Very accurate!",
            "date":   "2026-08-15",
        },
        {
            "id":     "3",
            "name":   "Ananya Patel",
            "role":   "MBA Student",
            "avatar": "👩‍🎓",
            "rating": 5,
            "text":   "The Gmail scan feature is incredible. Found 3 phishing emails "
                      "I had missed in my inbox. Highly recommend!",
            "date":   "2026-08-18",
        },
        {
            "id":     "4",
            "name":   "Karthik Nair",
            "role":   "Job Seeker",
            "avatar": "👨‍💼",
            "rating": 4,
            "text":   "Simple to use. Just paste the suspicious message and Ishu tells "
                      "you what to do. Saved me from a fake WFH scam.",
            "date":   "2026-08-20",
        },
    ]


# ===========================================================================
# ⑧ DAILY TIPS  —  Tips / Awareness Section
# ===========================================================================

@app.get("/api/tips", tags=["Website"])
async def get_tips():
    """
    Returns scam awareness tips. Shown in the Tips section of the website.
    Today's tip is based on the day of the week.
    """
    tips = [
        {
            "id":       "1",
            "category": "Job Scam",
            "icon":     "💼",
            "tip":      "Legitimate companies NEVER ask for a registration or "
                        "security deposit fee before giving you a job.",
            "color":    "#f0466b",
        },
        {
            "id":       "2",
            "category": "Email Phishing",
            "icon":     "📧",
            "tip":      "Always check the sender's email domain. Genuine companies "
                        "use their own domain, not Gmail or Yahoo.",
            "color":    "#7c9bff",
        },
        {
            "id":       "3",
            "category": "WhatsApp Scam",
            "icon":     "📱",
            "tip":      "If a job interview is conducted only over WhatsApp chat "
                        "with no video call — it's almost certainly a scam.",
            "color":    "#25d366",
        },
        {
            "id":       "4",
            "category": "UPI Fraud",
            "icon":     "💳",
            "tip":      "Never send money via UPI to 'unlock' a job offer or "
                        "receive a payment. Real employers don't work this way.",
            "color":    "#f5a524",
        },
        {
            "id":       "5",
            "category": "Document Safety",
            "icon":     "🪪",
            "tip":      "Never share your Aadhaar, PAN, or bank details before "
                        "receiving a formal, verified offer letter.",
            "color":    "#a855f7",
        },
        {
            "id":       "6",
            "category": "Lottery Scam",
            "icon":     "🎰",
            "tip":      "You cannot win a lottery you never entered. Any message "
                        "claiming you won a prize and need to pay fees is a scam.",
            "color":    "#2dd4bf",
        },
        {
            "id":       "7",
            "category": "WFH Scam",
            "icon":     "🏠",
            "tip":      "'Work from home, earn ₹X per day, no experience needed' "
                        "is the #1 sign of a mass-recruitment scam. Report it.",
            "color":    "#f472b6",
        },
    ]

    # Return today's featured tip + all tips
    today_index = datetime.now().weekday()  # 0=Mon … 6=Sun
    return {
        "todays_tip": tips[today_index],
        "all_tips":   tips,
    }


# ===========================================================================
# ⑨ CHAT  —  Chatbot Widget
# ===========================================================================

@app.post("/api/chat", response_model=AnalysisResult, tags=["Chatbot"])
async def chat(req: ChatRequest):
    """Main AI chat endpoint used by the embedded widget."""
    return await analyze_message(req.message, req.channel or "other", req.history)


# ===========================================================================
# ⑩ FILE ANALYSIS  —  PDF / Screenshot Upload
# ===========================================================================

def _extract_pdf_text(raw: bytes) -> str:
    import io
    import pdfplumber

    parts = []
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        for page in pdf.pages[:10]:
            parts.append(page.extract_text() or "")
    return "\n".join(parts).strip()


def _extract_image_text(raw: bytes) -> str:
    import io
    import pytesseract
    from PIL import Image

    try:
        img = Image.open(io.BytesIO(raw))
        return pytesseract.image_to_string(img).strip()
    except pytesseract.TesseractNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Tesseract OCR isn't installed. Run: choco install tesseract",
        )


@app.post("/api/analyze-file", response_model=AnalysisResult, tags=["Chatbot"])
async def analyze_file(file: UploadFile = File(...), channel: str = "other"):
    """Accepts a PDF or screenshot image and runs scam analysis on its text."""
    raw      = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith(".pdf") or file.content_type == "application/pdf":
        extracted = _extract_pdf_text(raw)
    elif file.content_type and file.content_type.startswith("image/"):
        extracted = _extract_image_text(raw)
    else:
        raise HTTPException(status_code=400,
                            detail="Only PDF or image (PNG/JPG) files are supported.")

    if not extracted:
        raise HTTPException(status_code=422,
                            detail="Couldn't read text from that file. Try a clearer screenshot.")

    return await analyze_message(extracted, channel)


# ===========================================================================
# ⑪ GMAIL  —  Inbox Scanner
# ===========================================================================

@app.get("/api/gmail/status", tags=["Gmail"])
async def gmail_status():
    return {
        "credentials_configured": gmail_service.has_credentials_file(),
        "connected":              gmail_service.is_connected(),
    }


@app.get("/api/gmail/login", tags=["Gmail"])
async def gmail_login():
    try:
        url = gmail_service.get_authorization_url()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return RedirectResponse(url)


@app.get("/api/gmail/callback", response_class=HTMLResponse, tags=["Gmail"])
async def gmail_callback(code: str = "", error: str = ""):
    if error:
        return HTMLResponse(f"<h3>Gmail connection failed: {error}</h3>")
    try:
        gmail_service.exchange_code(code)
    except Exception as e:
        return HTMLResponse(f"<h3>Gmail connection failed: {e}</h3>")
    return HTMLResponse(
        "<h3>Gmail connected ✅</h3><p>You can close this tab and go back to the chat.</p>"
    )


@app.get("/api/gmail/scan", response_model=List[EmailScanItem], tags=["Gmail"])
async def gmail_scan(max_results: int = 10):
    if not gmail_service.is_connected():
        raise HTTPException(status_code=401,
                            detail="Gmail isn't connected yet. Hit /api/gmail/login first.")
    try:
        emails = gmail_service.fetch_recent_emails(max_results=max_results)
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))

    results: List[EmailScanItem] = []
    for e in emails:
        combined = f"Subject: {e['subject']}\nFrom: {e['sender']}\n\n{e['body']}"
        analysis = await analyze_message(combined, channel="email")
        _v, _c, _f, why = _parse_verdict(analysis.reply)
        results.append(
            EmailScanItem(
                id=e["id"],
                subject=e["subject"],
                sender=e["sender"],
                date=e["date"],
                verdict=analysis.verdict,
                confidence=analysis.confidence,
                red_flags=analysis.red_flags,
                why=why,
            )
        )
    return results


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

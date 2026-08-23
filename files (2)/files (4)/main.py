"""
Aishu Scam Guard - Backend
---------------------------
FastAPI backend for the Aishu chat widget. Three ways in:

  POST /api/chat            - pasted text (email/WhatsApp/SMS copy-paste, or free chat)
  POST /api/analyze-file    - uploaded PDF or screenshot (PNG/JPG) of an offer/message
  GET  /api/gmail/login      -> redirects to Google consent screen
  GET  /api/gmail/callback   -> Google redirects back here after consent
  GET  /api/gmail/status     -> is Gmail connected?
  GET  /api/gmail/scan       -> fetches recent inbox mail and scam-checks each one

All three feed the same message into one local Ollama model with a shared
scam-detection system prompt, so the verdict logic lives in exactly one place.

Run:
    ollama pull llama3.2
    ollama serve
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

import re
import time
import uuid
from typing import List, Literal, Optional

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field

import gmail_service

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "llama3.2"          # change to whatever you've pulled
REQUEST_TIMEOUT = 60.0

SYSTEM_PROMPT = """You are Aishu, an AI safety assistant embedded in a website
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
- Asking the candidate to first "like/subscribe/review" something or do small paid tasks to "unlock" a bigger job
- Caller ID / sender that doesn't match the claimed company; asking to move the chat off official channels quickly

When given a message to check, respond ONLY in this compact format so the
frontend can render it nicely:

VERDICT: <one of: LIKELY SCAM | SUSPICIOUS | LOOKS LEGITIMATE>
CONFIDENCE: <Low | Medium | High>
RED FLAGS:
- <flag 1, short>
- <flag 2, short>
(omit this section if none found)
WHY:
<2-4 sentence plain-language explanation a student can understand>
WHAT TO DO:
<1-3 concrete, practical next steps, e.g. verify on official careers page, never pay, report to cybercrime.gov.in>

If the user is just chatting or asking a general question (not asking you to
check a message), answer normally and helpfully in 2-4 sentences. Keep every
reply concise, calm, and non-alarmist. Never shame the user for almost
falling for something."""

# --------------------------------------------------------------------------
# Models
# --------------------------------------------------------------------------

Role = Literal["user", "assistant"]


class ChatMessage(BaseModel):
    role: Role
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=6000)
    history: List[ChatMessage] = Field(default_factory=list)
    channel: Optional[Literal["email", "whatsapp", "sms", "call", "other"]] = "other"


class AnalysisResult(BaseModel):
    id: str
    reply: str
    verdict: Optional[str] = None
    confidence: Optional[str] = None
    red_flags: List[str] = Field(default_factory=list)
    latency_ms: int


class EmailScanItem(BaseModel):
    id: str
    subject: str
    sender: str
    date: str
    verdict: Optional[str] = None
    confidence: Optional[str] = None
    red_flags: List[str] = Field(default_factory=list)
    why: Optional[str] = None


# --------------------------------------------------------------------------
# App
# --------------------------------------------------------------------------

app = FastAPI(title="Aishu Scam Guard API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to your real domain before deploying
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _parse_verdict(text: str):
    verdict = confidence = None
    flags: List[str] = []
    why = None

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


async def call_ollama(messages: list) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
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
    text: str, channel: str = "other", history: Optional[List[ChatMessage]] = None
) -> AnalysisResult:
    start = time.time()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in (history or [])[-10:]:
        messages.append({"role": h.role, "content": h.content})

    user_content = text if channel == "other" else f"[Message received via: {channel}]\n{text}"
    messages.append({"role": "user", "content": user_content})

    reply_text = await call_ollama(messages)
    verdict, confidence, flags, _why = _parse_verdict(reply_text)

    return AnalysisResult(
        id=str(uuid.uuid4()),
        reply=reply_text,
        verdict=verdict,
        confidence=confidence,
        red_flags=flags,
        latency_ms=int((time.time() - start) * 1000),
    )


# --------------------------------------------------------------------------
# Text chat
# --------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat", response_model=AnalysisResult)
async def chat(req: ChatRequest):
    return await analyze_message(req.message, req.channel or "other", req.history)


# --------------------------------------------------------------------------
# File upload: PDF offer letters, screenshots of WhatsApp/SMS/email
# --------------------------------------------------------------------------


def _extract_pdf_text(raw: bytes) -> str:
    import io

    import pdfplumber

    text_parts = []
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        for page in pdf.pages[:10]:               # cap runaway PDFs
            text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts).strip()


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
            detail=(
                "Tesseract OCR isn't installed on this machine. Install it "
                "(e.g. 'choco install tesseract' on Windows) and make sure "
                "it's on PATH, then restart the backend."
            ),
        )


@app.post("/api/analyze-file", response_model=AnalysisResult)
async def analyze_file(
    file: UploadFile = File(...),
    channel: str = "other",
):
    raw = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith(".pdf") or file.content_type == "application/pdf":
        extracted = _extract_pdf_text(raw)
    elif file.content_type and file.content_type.startswith("image/"):
        extracted = _extract_image_text(raw)
    else:
        raise HTTPException(
            status_code=400,
            detail="Only PDF files and screenshot images (PNG/JPG) are supported.",
        )

    if not extracted:
        raise HTTPException(
            status_code=422,
            detail="Couldn't read any text from that file. Try a clearer screenshot, "
            "or paste the message text directly in the chat.",
        )

    return await analyze_message(extracted, channel)


# --------------------------------------------------------------------------
# Gmail: direct inbox scanning
# --------------------------------------------------------------------------


@app.get("/api/gmail/status")
async def gmail_status():
    return {
        "credentials_configured": gmail_service.has_credentials_file(),
        "connected": gmail_service.is_connected(),
    }


@app.get("/api/gmail/login")
async def gmail_login():
    try:
        url = gmail_service.get_authorization_url()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return RedirectResponse(url)


@app.get("/api/gmail/callback", response_class=HTMLResponse)
async def gmail_callback(code: str = "", error: str = ""):
    if error:
        return HTMLResponse(f"<h3>Gmail connection failed: {error}</h3>")
    try:
        gmail_service.exchange_code(code)
    except Exception as e:  # noqa: BLE001
        return HTMLResponse(f"<h3>Gmail connection failed: {e}</h3>")

    return HTMLResponse(
        "<h3>Gmail connected ✅</h3><p>You can close this tab and go back to the chat.</p>"
    )


@app.get("/api/gmail/scan", response_model=List[EmailScanItem])
async def gmail_scan(max_results: int = 10):
    if not gmail_service.is_connected():
        raise HTTPException(
            status_code=401,
            detail="Gmail isn't connected yet. Hit /api/gmail/login first.",
        )
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

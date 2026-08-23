"""
gmail_service.py
-----------------
Thin wrapper around the Gmail API (read-only) so main.py can:
  1. send the user to Google's consent screen
  2. exchange the returned code for a token
  3. list + read recent messages for scam scanning

Setup (one-time, per Google Cloud project):
  1. https://console.cloud.google.com -> create/select a project
  2. Enable the "Gmail API"
  3. OAuth consent screen -> External -> add yourself as a test user
  4. Credentials -> Create Credentials -> OAuth client ID -> "Web application"
     Authorized redirect URI: http://localhost:8000/api/gmail/callback
  5. Download the JSON, save it as backend/credentials.json (gitignored)

First time you hit /api/gmail/login and approve access, a token.json is
written next to this file and reused (auto-refreshed) after that.
"""

import base64
import os
from email.mime.text import MIMEText
from typing import List, Optional, TypedDict

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")
REDIRECT_URI = "http://localhost:8000/api/gmail/callback"


class EmailSummary(TypedDict):
    id: str
    subject: str
    sender: str
    date: str
    body: str


def has_credentials_file() -> bool:
    return os.path.exists(CREDENTIALS_FILE)


def is_connected() -> bool:
    return os.path.exists(TOKEN_FILE)


def build_auth_flow() -> Flow:
    if not has_credentials_file():
        raise FileNotFoundError(
            "backend/credentials.json not found. Download it from Google Cloud "
            "Console (OAuth client, Web application type) and save it there."
        )
    return Flow.from_client_secrets_file(
        CREDENTIALS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI
    )


def get_authorization_url() -> str:
    flow = build_auth_flow()
    auth_url, _state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url


def exchange_code(code: str) -> None:
    flow = build_auth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    with open(TOKEN_FILE, "w") as f:
        f.write(creds.to_json())


def _get_credentials() -> Optional[Credentials]:
    if not os.path.exists(TOKEN_FILE):
        return None
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return creds


def _header(headers: list, name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _extract_body(payload: dict) -> str:
    """Pull plain-text body out of a Gmail message payload (handles multipart)."""
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", "ignore")

    for part in payload.get("parts", []) or []:
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", "ignore")

    # fall back to first html part, strip tags crudely
    for part in payload.get("parts", []) or []:
        if part.get("mimeType") == "text/html" and part.get("body", {}).get("data"):
            html = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", "ignore")
            import re

            return re.sub("<[^<]+?>", " ", html)

    # nested multipart
    for part in payload.get("parts", []) or []:
        nested = _extract_body(part)
        if nested:
            return nested

    return ""


def fetch_recent_emails(max_results: int = 15, query: str = "newer_than:14d") -> List[EmailSummary]:
    creds = _get_credentials()
    if not creds:
        raise RuntimeError("Gmail is not connected yet. Call /api/gmail/login first.")

    service = build("gmail", "v1", credentials=creds)
    resp = service.users().messages().list(
        userId="me", maxResults=max_results, q=query
    ).execute()

    results: List[EmailSummary] = []
    for m in resp.get("messages", []):
        msg = service.users().messages().get(
            userId="me", id=m["id"], format="full"
        ).execute()
        headers = msg.get("payload", {}).get("headers", [])
        body = _extract_body(msg.get("payload", {})) or msg.get("snippet", "")
        results.append(
            EmailSummary(
                id=m["id"],
                subject=_header(headers, "Subject") or "(no subject)",
                sender=_header(headers, "From") or "(unknown sender)",
                date=_header(headers, "Date") or "",
                body=body[:4000],  # keep prompt size sane
            )
        )
    return results

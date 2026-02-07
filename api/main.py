from fastapi import FastAPI, Request, Response, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
import os
import requests
import base64
import httpx
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

templates = Jinja2Templates(directory="templates")
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
if not ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
async def ping():
    return {"status": "ok"}

BOT_TOKEN = os.getenv("BOT_TOKEN")
BOT_OWNER_CHAT_ID = os.getenv("BOT_OWNER_CHAT_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("REFRESH_TOKEN")
NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_DB_ID = os.getenv("NOTION_DB_ID")

token_cache = {
    "access_token": None,
    "expires_at": None
}

def _spotify_token_error_message(response):
    try:
        payload = response.json()
    except ValueError:
        payload = {}

    spotify_error = payload.get("error")
    description = payload.get("error_description")

    if spotify_error and description:
        return f"{spotify_error}: {description}"
    if spotify_error:
        return str(spotify_error)

    body = (response.text or "").strip()
    return body[:200] if body else f"HTTP {response.status_code}"

def get_access_token():
    global token_cache

    missing = [
        key for key, value in {
            "CLIENT_ID": CLIENT_ID,
            "CLIENT_SECRET": CLIENT_SECRET,
            "REFRESH_TOKEN": REFRESH_TOKEN,
        }.items() if not value
    ]
    if missing:
        return None, f"Missing required env vars: {', '.join(missing)}"

    if token_cache["access_token"] and token_cache["expires_at"] and datetime.now() < token_cache["expires_at"]:
        return token_cache["access_token"], None

    try:
        auth_header = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()

        response = requests.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": REFRESH_TOKEN,
            },
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            expires_in = data.get("expires_in")
            if not access_token or not expires_in:
                return None, "Spotify token response missing required fields"
            token_cache["access_token"] = access_token
            token_cache["expires_at"] = datetime.now() + timedelta(seconds=max(expires_in - 60, 0))
            return access_token, None
        return None, _spotify_token_error_message(response)
    except requests.RequestException as e:
        return None, f"Spotify token request failed: {str(e)}"
    except Exception as e:
        return None, f"Unexpected token error: {str(e)}"

async def save_to_notion(name, email, subject, message):
    url = "https://api.notion.com/v1/pages"
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }
    data = {
        "parent": {"database_id": NOTION_DB_ID},
        "properties": {
            "Name": {"title": [{"text": {"content": name}}]},
            "Email": {"rich_text": [{"text": {"content": email}}]},
            "Subject": {"rich_text": [{"text": {"content": subject}}]},
            "Message": {"rich_text": [{"text": {"content": message}}]}
        }
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=data, headers=headers)
        res.raise_for_status()
        return res.json()

@app.get("/api/spotify")
async def get_now_playing():
    access_token, token_error = get_access_token()
    if not access_token:
        return JSONResponse(
            {"error": "Failed to get Spotify token", "details": token_error},
            status_code=502
        )

    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        now = requests.get("https://api.spotify.com/v1/me/player/currently-playing", headers=headers)

        if now.status_code == 200 and now.content:
            data = now.json()
            if data.get("item"):
                return {
                    "song": data["item"]["name"],
                    "artist": ", ".join(a["name"] for a in data["item"]["artists"]),
                    "albumArt": data["item"]["album"]["images"][0]["url"] if data["item"]["album"]["images"] else None,
                    "isPlaying": True,
                    "spotifyUrl": data["item"]["external_urls"]["spotify"],
                }

        recent = requests.get(
            "https://api.spotify.com/v1/me/player/recently-played?limit=1",
            headers=headers
        )

        if recent.status_code == 200:
            data = recent.json()
            if data["items"]:
                track = data["items"][0]["track"]
                played_at = datetime.strptime(data["items"][0]["played_at"], "%Y-%m-%dT%H:%M:%S.%fZ")
                return {
                    "song": track["name"],
                    "artist": ", ".join(a["name"] for a in track["artists"]),
                    "albumArt": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
                    "isPlaying": False,
                    "spotifyUrl": track["external_urls"]["spotify"],
                    "playedAt": played_at.isoformat()
                }

        return {"error": "No recent tracks found"}
    except Exception as e:
        return {"error": f"Failed to fetch music data: {str(e)}"}

footer_message = {"text": "Welcome to my portfolio!"}

@app.post("/api/footer-message")
async def set_footer_message(request: Request):
    data = await request.json()
    footer_message["text"] = data.get("text", footer_message["text"])
    return {"status": "ok"}

@app.get("/api/footer-message")
async def get_footer_message():
    return {"text": footer_message["text"]}

@app.post("/api/submit-contact")
async def submit_contact(
    name: str = Form("Anonymous"),
    email: str = Form(...),
    subject: str = Form("No Subject"),
    message: str = Form(...)
):
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    text = (
        "📩 *New Contact Form Submission!*\n\n"
        f"\n"
        f"👤 *Name:* {name}\n"
        f"\n"
        f"✉️ *Email:* {email}\n"
        f"\n"
        f"📌 *Subject:* {subject}\n"
        f"\n"
        f"💬 *Message:* {message}"
    )

    try:
        # send to Telegram
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": BOT_OWNER_CHAT_ID,
            "text": text,
            "parse_mode": "Markdown"
        }

        async with httpx.AsyncClient() as client:
            telegram_response = await client.post(url, data=payload)
            print(f"[DEBUG] Telegram response: {telegram_response.status_code}")

        # save to Notion
        print("[DEBUG] Attempting to save to Notion...")
        notion_response = await save_to_notion(name, email, subject, message)
        print(f"[DEBUG] Notion save successful: {notion_response}")

    except Exception as e:
        print(f"[contact error] failed: {e}")
        print(f"[contact error] error type: {type(e)}")
        import traceback
        traceback.print_exc()

    return {
        "status": "ok",
        "name": name,
        "email": email,
        "subject": subject,
        "message": message
    }

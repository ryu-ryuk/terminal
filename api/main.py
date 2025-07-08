from fastapi import FastAPI, Request, Response, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
import json
import os
from dotenv import load_dotenv
import requests
import base64
import httpx
from datetime import datetime, timedelta
from fastapi.routing import APIRouter


load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://alokranjan.me", "https://archya.web.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
async def ping():
    return {"status": "ok"}

BOT_TOKEN = os.getenv("BOT_TOKEN")
BOT_OWNER_CHAT_ID = os.getenv("BOT_OWNER_CHAT_ID")

@app.get("/updates", response_class=HTMLResponse)
async def updates(request: Request):
    posts = load_posts()
    return templates.TemplateResponse("updates.html", {"request": request, "posts": reversed(posts)})

@app.get("/")
async def root():
    return HTMLResponse(content="<html><body><h1>Spotify API Server Running</h1></body></html>")

# Spotify API credentials
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("REFRESH_TOKEN") 

# Global token cache
token_cache = {
    "access_token": None,
    "expires_at": None
}

def get_access_token():
    """Get a valid access token using the refresh token"""
    global token_cache
    
    # If we have a valid cached token, use it
    if token_cache["access_token"] and token_cache["expires_at"] and datetime.now() < token_cache["expires_at"]:
        return token_cache["access_token"]
    
    # Otherwise, get a new token
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
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            token_cache["access_token"] = data["access_token"]
            # Set expiry time with a small buffer
            token_cache["expires_at"] = datetime.now() + timedelta(seconds=data["expires_in"] - 60)
            return data["access_token"]
        else:
            print(f"Error refreshing token: {response.text}")
            return None
    except Exception as e:
        print(f"Exception getting token: {str(e)}")
        return None

@app.get("/api/spotify")
async def get_now_playing():
    """Get the currently playing or recently played track"""
    access_token = get_access_token()
    
    if not access_token:
        return JSONResponse({
            "error": "Failed to get Spotify token"
        })
    
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Try currently playing first
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
        
        # If not playing, get recently played
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
        print(f"Error fetching Spotify data: {str(e)}")
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
        f"👤 *Name:* {name}\n"
        f"✉️ *Email:* {email}\n"
        f"📌 *Subject:* {subject}\n"
        f"💬 *Message:* {message}"
    )

    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": BOT_OWNER_CHAT_ID,
            "text": text,
            "parse_mode": "Markdown"
        }

        async with httpx.AsyncClient() as client:
            await client.post(url, data=payload)

    except Exception as e:
        print(f"[contact error] failed to send to Telegram: {e}")

    return {
        "status": "ok",
        "name": name,
        "email": email,
        "subject": subject,
        "message": message
    }
# @app.get("/api/posts")
# async def get_posts():
#     """Get the list of posts"""
#     posts = load_posts()
#     return JSONResponse(posts)  

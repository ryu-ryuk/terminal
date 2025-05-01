import os
import base64
import requests
from fastapi import Request
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from datetime import datetime
from itsdangerous import URLSafeSerializer, BadData

load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("REFRESH_TOKEN")
SECRET_KEY = os.getenv("COOKIE_SECRET") 
serializer = URLSafeSerializer(SECRET_KEY)

def get_token_data_from_cookie(request: Request):
    """Extract and decode Spotify tokens from signed cookie"""
    cookie = request.cookies.get("spotify_tokens")
    if not cookie:
        return None
    try:
        tokens = serializer.loads(cookie)
        return tokens
    except BadData:
        return None

async def fetch_spotify_data(tokens):
    """Fetch currently playing or recently played track using the provided tokens"""
    if not tokens or 'access_token' not in tokens:
        return {
            "error": "Not authenticated",
            "loginUrl": "/login"
        }

    try:
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        # Try currently playing
        now = requests.get("https://api.spotify.com/v1/me/player/currently-playing", headers=headers)

        # Refresh if token expired
        if now.status_code == 401:
            refresh_response = requests.post(
                "https://accounts.spotify.com/api/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": tokens['refresh_token'],
                },
                headers={
                    "Authorization": f"Basic {base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()}",
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            if refresh_response.status_code == 200:
                new_tokens = refresh_response.json()
                tokens.update({
                    'access_token': new_tokens['access_token'],
                    'refresh_token': new_tokens.get('refresh_token', tokens['refresh_token'])
                })
                return await fetch_spotify_data(tokens)
            else:
                print(f"Failed to refresh token: {refresh_response.text}")
                return {"error": "Failed to refresh token"}

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

    except Exception as e:
        print(f"Error fetching Spotify data: {str(e)}")
        
    return {
        "error": "Failed to fetch music data",
        "loginUrl": "/login"
    }

def refresh_spotify_token(refresh_token):
    """Refresh the Spotify access token"""
    try:
        response = requests.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            headers={
                "Authorization": f"Basic {base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )

        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to refresh token: {response.text}")
            return None
    except Exception as e:
        print(f"Error refreshing token: {e}")
        return None

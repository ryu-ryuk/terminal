const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
const querystring = require("querystring");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve static files from "public"

// Spotify Credentials
const client_id = process.env.SPOTIFY_CLIENT_ID; // Your Spotify Client ID
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your Spotify Client Secret
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${PORT}/callback`; // Your Redirect URI
let access_token = null; // Store access token
let refresh_token = null; // Store refresh token

// Generate random state string for security
function generateRandomString(length) {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Login Route
app.get("/login", (req, res) => {
    const state = generateRandomString(16);
    const scope = "user-read-currently-playing user-read-playback-state";

    const authUrl =
        "https://accounts.spotify.com/authorize?" +
        querystring.stringify({
            response_type: "code",
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state,
        });

    res.redirect(authUrl);
});

// Callback Route
app.get("/callback", async (req, res) => {
    const code = req.query.code || null;

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization:
                    "Basic " +
                    Buffer.from(client_id + ":" + client_secret).toString("base64"),
            },
            body: querystring.stringify({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirect_uri,
            }),
        });

        const data = await response.json();

        access_token = data.access_token;
        refresh_token = data.refresh_token;

        res.redirect("/"); // Redirect back to homepage after login
    } catch (error) {
        console.error("Error during token exchange:", error);
        res.status(500).send("Authentication failed.");
    }
});

// Refresh Access Token Function
async function refreshAccessToken() {
    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization:
                    "Basic " +
                    Buffer.from(client_id + ":" + client_secret).toString("base64"),
            },
            body: querystring.stringify({
                grant_type: "refresh_token",
                refresh_token: refresh_token,
            }),
        });

        const data = await response.json();
        access_token = data.access_token;
    } catch (error) {
        console.error("Error refreshing access token:", error);
    }
}

// Now Playing Route
app.get("/spotify", async (req, res) => {
    if (!access_token) {
        return res.status(401).json({ error: "User not authenticated" });
    }

    try {
        const response = await fetch(
            "https://api.spotify.com/v1/me/player/currently-playing",
            {
                headers: { Authorization: `Bearer ${access_token}` },
            }
        );

        if (response.status === 204 || response.status > 400) {
            return res.json({
                song: "Not Playing",
                artist: "Unknown",
                albumArt: "/placeholder.jpg", // Replace with a placeholder image
            });
        }

        const data = await response.json();

        res.json({
            song: data.item.name,
            artist: data.item.artists.map((artist) => artist.name).join(", "),
            albumArt: data.item.album.images[0].url,
        });
    } catch (error) {
        console.error("Error fetching now playing:", error);

        if (error.response && error.response.status === 401) {
            await refreshAccessToken(); // Refresh token if expired
            return res.redirect("/spotify"); // Retry after refreshing token
        }

        res.status(500).json({ error: "Failed to fetch now playing data." });
    }
});

// Start Server
app.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`)
);

const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
require('dotenv').config();
const fetch = require('node-fetch'); // Ensure this is installed or use built-in Fetch API

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve static files from "public"

// Route to serve frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Spotify Placeholder Route
app.get('/spotify', async (req, res) => {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${process.env.SPOTIFY_ACCESS_TOKEN}` }
        });
        if (!response.ok) throw new Error('Failed to fetch Spotify data');
        const data = await response.json();
        res.json({
            song: data.item.name,
            artist: data.item.artists.map(artist => artist.name).join(', '),
            albumArt: data.item.album.images[0].url,
        });
    } catch (error) {
        console.error(error);
        res.json({
            song: "Not Playing",
            artist: "Unknown",
            albumArt: "placeholder.jpg",
        });
    }
});

// API to execute Python script
app.get("/api/run-python", (req, res) => {
    exec("python3 src/main.py", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        res.json({ output: stdout });
    });
});

let currentProject = "Building my portfolio";

app.get("/api/current-project", (req, res) => {
    res.json({ project: currentProject });
});

app.post("/api/update-project", (req, res) => {
    currentProject = req.body.project;
    res.json({ message: "Project updated!" });
});

// Fallback route for SPAs
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
import { getCache, setCache } from "../utils/cache.js";
import { themes } from "../lib/themes.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_IMAGE = "/images/default.jpg";
const API_KEY = process.env.LASTFM_API_KEY;
const BASE_URL = "http://ws.audioscrobbler.com/2.0/";
const TEMPLATE_PATH = path.join(__dirname, "../templates/currently-playing.html");

function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderTemplate(template, data) {
    template = template.replace(
        /{{#ifNowPlaying}}([\s\S]*?){{else}}([\s\S]*?){{\/ifNowPlaying}}/g,
        (_, ifBlock, elseBlock) => (data.nowPlaying ? ifBlock : elseBlock)
    );
    template = template.replace(
        /{{#ifNowPlaying}}([\s\S]*?){{\/ifNowPlaying}}/g,
        (_, ifBlock) => (data.nowPlaying ? ifBlock : "")
    );
    template = template.replace(
        /{{#ifAlbum}}([\s\S]*?){{\/ifAlbum}}/g,
        (_, block) => (data.albumName ? block : "")
    );
    template = template.replace(
        /{{#ifShowProfile}}([\s\S]*?){{\/ifShowProfile}}/g,
        (_, block) => (data.showProfile ? block : "")
    );
    // Replace variables
    return template.replace(/\{\s*\{\s*([a-zA-Z0-9_]+)\s*\}\s*\}/g, (_, key) => {
        const val = data[key];
        return escapeHtml(val ?? "");
    });
}

export default async function currentlyPlayingRoute(req) {
    try {
        let url;
        if (typeof req === 'string') {
            url = new URL(req);
        } else if (req.url) {
            url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        } else {
            throw new Error('Invalid request object');
        }

        const username = url.searchParams.get("user");
        const showProfile = url.searchParams.has("showProfile")
            ? url.searchParams.get("showProfile") === "true"
            : true;
        const themeName = url.searchParams.get("theme") || "default";
        const theme = themes[themeName] || themes.default;

        if (!username) {
            return { error: "Missing user parameter", status: 400 };
        }

        const cacheKey = `currently-playing_${username}_${themeName}`;
        const cached = getCache(cacheKey);
        if (cached) {
            return { html: cached, status: 200 };
        }

        const recentTracksUrl = `${BASE_URL}?method=user.getrecenttracks&user=${username}&api_key=${API_KEY}&format=json&limit=1`;
        const res = await fetch(recentTracksUrl);
        if (!res.ok) throw new Error("Failed to fetch recent tracks");

        const data = await res.json();
        const track = data.recenttracks?.track?.[0];
        const nowPlaying = !!(track && track["@attr"]?.nowplaying === "true");

        const template = await fs.readFile(TEMPLATE_PATH, "utf-8");
        const renderData = {
            username,
            showProfile,
            themeBg: theme.bg,
            themeText: theme.text,
            themeUrl: theme.url,
            nowPlaying,
            trackImage: (track?.image?.[1]?.["#text"] || DEFAULT_IMAGE),
            trackName: track?.name || "",
            trackUrl: track?.url || "#",
            artistName: track?.artist?.["#text"] || track?.artist?.name || "",
            artistUrl: track?.artist?.url || "",
            albumName: track?.album?.["#text"] || "",
            albumUrl: track?.album?.url || "",
        };

        const html = renderTemplate(template, renderData);
        setCache(cacheKey, html, 30); // cache 30 seconds

        return { html, status: 200 };
    } catch (err) {
        return {
            html: `<p>Error: ${escapeHtml(err?.message)}</p>`,
            status: 500
        };
    }
}
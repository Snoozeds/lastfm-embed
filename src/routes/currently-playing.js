import { getCache, setCache } from "../utils/cache.js";
import { themes } from "../lib/themes.js";
import { getCurrentlyPlaying } from "../services/lastfm.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    template = template.replace(
        /{{#ifShowTitle}}([\s\S]*?){{\/ifShowTitle}}/g,
        (_, block) => (data.showTitle ? block : "")
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
        const showTitle = url.searchParams.get("showTitle")
            ? url.searchParams.get("showTitle") === "true"
            : true;
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

        const currentlyPlayingData = await getCurrentlyPlaying(username);

        const template = await fs.readFile(TEMPLATE_PATH, "utf-8");
        const renderData = {
            username,
            showProfile,
            showTitle,
            themeBg: theme.bg,
            themeText: theme.text,
            themeUrl: theme.url,
            nowPlaying: currentlyPlayingData.nowPlaying,
            trackImage: currentlyPlayingData.track?.image || "/images/default.jpg",
            trackName: currentlyPlayingData.track?.name || "",
            trackUrl: currentlyPlayingData.track?.url || "#",
            artistName: currentlyPlayingData.track?.artist?.name || "",
            artistUrl: currentlyPlayingData.track?.artist?.url || "",
            albumName: currentlyPlayingData.track?.album?.name || "",
            albumUrl: currentlyPlayingData.track?.album?.url || "",
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
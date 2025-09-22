import { getCache, setCache } from "../utils/cache.js";
import { themes } from "../lib/themes.js";
import { getUserStats } from "../services/lastfm.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, "../templates/stats.html");

function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatNumber(num, useCommas = true) {
    if (!num || isNaN(num)) return "0";

    const numStr = num.toString();
    if (useCommas) {
        // Use commas (123,456)
        return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } else {
        // Use periods (123.456)
        return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
}

function renderTemplate(template, data) {
    template = template.replace(
        /{{#ifShowTitle}}([\s\S]*?){{\/ifShowTitle}}/g,
        (_, block) => (data.showTitle ? block : "")
    );
    template = template.replace(
        /{{#ifShowProfile}}([\s\S]*?){{\/ifShowProfile}}/g,
        (_, block) => (data.showProfile ? block : "")
    );
    template = template.replace(
        /{{#ifNoStats}}([\s\S]*?){{\/ifNoStats}}/g,
        (_, block) => (data.noStats ? block : "")
    );
    template = template.replace(
        /{{#ifHasStats}}([\s\S]*?){{\/ifHasStats}}/g,
        (_, block) => (!data.noStats ? block : "")
    );

    // variables
    return template.replace(/\{\s*\{\s*([a-zA-Z0-9_]+)\s*\}\s*\}/g, (_, key) => {
        const val = data[key];
        return escapeHtml(val ?? "");
    });
}

function formatStreak(days) {
    if (!days || days === 0) return "0";

    // Less than a year
    if (days < 365) {
        return `${days}`;
    }

    const years = Math.floor(days / 365);

    if (years === 1) {
        return "1 year+";
    }
}

export default async function statsRoute(req) {
    try {
        let url;
        if (typeof req === "string") {
            url = new URL(req);
        } else if (req.url) {
            url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        } else {
            throw new Error("Invalid request object");
        }

        const username = url.searchParams.get("user");
        const showTitle = url.searchParams.has("showTitle")
            ? url.searchParams.get("showTitle") === "true"
            : true;
        const showProfile = url.searchParams.has("showProfile")
            ? url.searchParams.get("showProfile") === "true"
            : true;
        const themeName = url.searchParams.get("theme") || "default";

        const useCommas = url.searchParams.has("numberFormat")
            ? (url.searchParams.get("numberFormat") === "commas" || url.searchParams.get("numberFormat") === "comma")
            : true;

        const theme = themes[themeName] || themes.default;

        if (!username) {
            return { error: "Missing user parameter", status: 400 };
        }

        const cacheKey = `stats_${username}_${themeName}_${showTitle}_${showProfile}_${useCommas}`;
        const cached = getCache(cacheKey);
        if (cached) {
            return { html: cached, status: 200 };
        }

        const stats = await getUserStats(username);
        const noStats = !stats.totalScrobbles || stats.totalScrobbles === 0;
        const template = await fs.readFile(TEMPLATE_PATH, "utf-8");

        const formattedStreak = formatStreak(stats.currentStreak);

        const totalScrobblesNum = parseInt(stats.totalScrobbles.replace(/[,\.]/g, ''), 10);
        const formattedTotalScrobbles = noStats ? "0" : formatNumber(totalScrobblesNum, useCommas);

        const avgPerDayNum = parseFloat(stats.avgPerDay);
        const formattedAvgPerDay = noStats ? "0" : formatNumber(avgPerDayNum, useCommas);

        const renderData = {
            username,
            showTitle,
            showProfile,
            themeBg: theme.bg,
            themeText: theme.text,
            themeUrl: theme.url,
            themeScrobble: theme.scrobble,
            totalScrobbles: formattedTotalScrobbles,
            avgPerDay: formattedAvgPerDay,
            currentStreak: noStats ? "0" : formattedStreak,
            noStats,
        };

        const html = renderTemplate(template, renderData);
        setCache(cacheKey, html, 30); // cache 30 seconds
        return { html, status: 200 };
    } catch (err) {
        return {
            html: `<p>Error: ${escapeHtml(err?.message)}</p>`,
            status: 500,
        };
    }
}
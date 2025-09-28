import { getCache, setCache } from "../utils/cache.js";
import { themes } from "../lib/themes.js";
import { getUserStats } from "../services/lastfm.js";
import { t } from "../utils/i18n.js";
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

    const [intPart, decPart] = num.toString().split(".");
    const sep = useCommas ? "," : ".";
    const decimalSep = useCommas ? "." : ",";

    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return decPart ? `${formattedInt}${decimalSep}${decPart}` : formattedInt;
}

function renderTemplate(template, data) {
    template = template.replace(
        /{{#ifShowTitle}}([\s\S]*?){{\/ifShowTitle}}/g,
        (_, block) => (data.showTitle ? block : "")
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

    return `${years} years+`;
}

function formatStreakDates(startDate, endDate, locale) {
    if (!startDate || !endDate) return "";

    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00.000Z');
        return date.toLocaleDateString(locale, {
            month: 'short',
            day: 'numeric',
            year: startDate !== endDate && date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);

    if (startDate === endDate) {
        return formattedEnd;
    } else {
        return `${formattedStart} - ${formattedEnd}`;
    }
}

function formatRegistrationDate(registeredUnix, locale) {
    const date = new Date(registeredUnix);
    return date.toLocaleDateString(locale, {
        month: 'short',
        year: 'numeric'
    });
}

// Basic stats without streak (will calculate streak later)
async function getBasicUserStats(username, locale = 'en') {
    const BASE_URL = "http://ws.audioscrobbler.com/2.0/";
    const API_KEY = process.env.LASTFM_API_KEY;

    const infoUrl = `${BASE_URL}?method=user.getinfo&user=${encodeURIComponent(
        username
    )}&api_key=${API_KEY}&format=json`;

    const infoRes = await fetch(infoUrl);
    if (!infoRes.ok) throw new Error("Failed to fetch Last.fm user info");
    const infoData = await infoRes.json();

    const totalScrobbles = parseInt(infoData.user.playcount, 10);
    const registeredUnix = parseInt(infoData.user.registered.unixtime, 10) * 1000;
    const daysSince = Math.max(
        1,
        Math.floor((Date.now() - registeredUnix) / (1000 * 60 * 60 * 24))
    );
    const avgPerDay = (totalScrobbles / daysSince).toFixed(1);

    return {
        totalScrobbles: totalScrobbles.toLocaleString(),
        avgPerDay,
        registeredDate: formatRegistrationDate(registeredUnix, locale),
    };
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
        const themeName = url.searchParams.get("theme") || "default";
        const streakOnly = url.searchParams.get("streakOnly") === "true";

        const useCommas = url.searchParams.has("numberFormat")
            ? (url.searchParams.get("numberFormat") === "commas" || url.searchParams.get("numberFormat") === "comma")
            : true;

        const borderSizeParam = url.searchParams.get("borderSize");
        let borderSize = 0; // default value
        if (borderSizeParam !== null) {
            const parsed = parseInt(borderSizeParam, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 20) { // max size of 20px
                borderSize = parsed;
            }
        }

        const borderRadiusParam = url.searchParams.get("borderRadius");
        let borderRadius = 16; // default value
        if (borderRadiusParam !== null) {
            const parsed = parseInt(borderRadiusParam, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 32) { // max size of 32px
                borderRadius = parsed;
            }
        }

        const theme = themes[themeName] || themes.default;
        const locale = url.searchParams.get("lang") || "en";

        if (!username) {
            return { error: "Missing user parameter", status: 400 };
        }

        if (streakOnly) {
            const streakCacheKey = `streak_${username}`;
            let cached = getCache(streakCacheKey);

            if (!cached) {
                // Calculate streak if not cached
                const stats = await getUserStats(username);
                cached = {
                    streak: stats.currentStreak,
                    startDate: stats.streakStartDate,
                    endDate: stats.streakEndDate
                };
                setCache(streakCacheKey, cached, 21600); // 6h cache for streak only
            }

            const formattedStreak = formatStreak(cached.streak);
            const formattedDates = formatStreakDates(cached.startDate, cached.endDate, locale);

            return {
                json: {
                    streak: formattedStreak,
                    dates: formattedDates,
                    days: cached.streak,
                    startDate: cached.startDate,
                    endDate: cached.endDate
                },
                status: 200
            };
        }

        const cacheKey = `stats_${username}_${themeName}_${showTitle}_${useCommas}`;
        const cached = getCache(cacheKey);
        if (cached) {
            return { html: cached, status: 200 };
        }

        const stats = await getBasicUserStats(username, locale);
        const noStats = !stats.totalScrobbles || stats.totalScrobbles === 0;
        const template = await fs.readFile(TEMPLATE_PATH, "utf-8");

        const totalScrobblesNum = parseInt(stats.totalScrobbles.replace(/[,\.]/g, ''), 10);
        const formattedTotalScrobbles = noStats ? "0" : formatNumber(totalScrobblesNum, useCommas);

        const avgPerDayNum = parseFloat(stats.avgPerDay);
        const formattedAvgPerDay = noStats ? "0" : formatNumber(avgPerDayNum, useCommas);

        const renderData = {
            username,
            showTitle,
            themeBg: theme.bg,
            themeText: theme.text,
            themeUrl: theme.url,
            themeScrobble: theme.scrobble,
            borderSize: borderSize,
            borderRadius: borderRadius,
            totalScrobbles: formattedTotalScrobbles,
            avgPerDay: formattedAvgPerDay,
            registeredDate: stats.registeredDate,
            currentStreak: "0", // Will be loaded via js in the stats.html template
            noStats,

            // Translations
            locale,
            statsLabel: t("stats.stats", locale),
            totalScrobblesLabel: t("stats.total_scrobbles", locale),
            averageLabel: t("stats.average_day", locale),
            loadingStreakLabel: t("stats.loading_streak", locale),
            currentStreakLabel: t("stats.current_streak", locale),
            sinceLabel: t("stats.since", locale),
        };

        const html = renderTemplate(template, renderData);
        setCache(cacheKey, html, 60); // Cache for 1 minute
        return { html, status: 200 };
    } catch (err) {
        return {
            html: `<p>Error: ${escapeHtml(err?.message)}</p>`,
            status: 500,
        };
    }
}
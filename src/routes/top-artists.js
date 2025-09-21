import { getUserTopArtists } from "../services/lastfm.js";
import { themes } from "../lib/themes.js";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_ROWS = parseInt(process.env.MAX_ROWS || "10");
const MIN_ROWS = parseInt(process.env.MIN_ROWS || "1");

const MAX_COLUMNS = parseInt(process.env.MAX_COLUMNS || "5");
const MIN_COLUMNS = parseInt(process.env.MIN_COLUMNS || "1");

const MAX_ITEMS_PER_ROW = parseInt(process.env.MAX_ITEMS_PER_ROW || "10");
const MIN_ITEMS_PER_ROW = parseInt(process.env.MIN_ITEMS_PER_ROW || "1");

function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export default async function topArtistsRoute(req) {
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
        const themeName = url.searchParams.get("theme") || "default";
        const limit = parseInt(url.searchParams.get("limit") || "5");
        const showProfile = url.searchParams.has("showProfile")
            ? url.searchParams.get("showProfile") === "true"
            : true;
        const layout = url.searchParams.get("layout") || "vertical";
        const period = url.searchParams.get("period") || "overall";
        const usePlaceholderImage = url.searchParams.has("usePlaceholderImage")
            ? url.searchParams.get("usePlaceholderImage") === "true"
            : false;

        if (!username) {
            return { error: "Missing user parameter", status: 400 };
        }

        const stats = await getUserTopArtists(username, limit, period);
        const theme = themes[themeName] || themes.default;

        let rows = parseInt(url.searchParams.get("rows") || "0");
        rows = rows === 0 ? 0 : Math.max(MIN_ROWS, Math.min(rows, MAX_ROWS));

        let columns = parseInt(url.searchParams.get("columns") || "0");
        columns = columns === 0 ? 0 : Math.max(MIN_COLUMNS, Math.min(columns, MAX_COLUMNS));

        let itemsPerRow = parseInt(url.searchParams.get("itemsPerRow") || "5");
        itemsPerRow = Math.max(MIN_ITEMS_PER_ROW, Math.min(itemsPerRow, MAX_ITEMS_PER_ROW));

        let verticalGridStyle = "";
        if (columns > 0) verticalGridStyle += `grid-template-columns: repeat(${columns}, 1fr);`;
        else verticalGridStyle += `grid-template-columns: 1fr;`;
        if (rows > 0) verticalGridStyle += `grid-auto-rows: calc(100% / ${rows});`;

        // Profile HTML
        const profileHtml = showProfile
            ? `<a class="profile-link" href="https://www.last.fm/user/${escapeHtml(username)}" target="_blank">${escapeHtml(username)}</a>'s `
            : "";

        // Artist list HTML
        const artistsHtml = stats.topartists.artist
            .map((artist, index) => {
                const rankNumber = index + 1;
                const imageHtml = usePlaceholderImage 
                    ? `<img src="${escapeHtml(artist.image)}" alt="${escapeHtml(artist.name)} image" />`
                    : `<div class="rank-number">${rankNumber}</div>`;
                
                return `
      <li class="${escapeHtml(layout)}">
        ${imageHtml}
        <div class="artist-info">
          <span class="artist-name" title="${escapeHtml(artist.name)}">${artist.url ? `<a href="${escapeHtml(artist.url)}" target="_blank">${escapeHtml(artist.name)}</a>` : escapeHtml(artist.name)}</span>
          <span class="artist-stats">${escapeHtml(artist.playcount)} scrobble${artist.playcount !== "1" ? "s" : ""}</span>
        </div>
      </li>
    `;
            })
            .join("");

        const periodLabels = {
            overall: "All Time",
            "7day": "Last 7 Days",
            "1month": "Last Month",
            "3month": "Last 3 Months",
            "6month": "Last 6 Months",
            "12month": "Last Year",
        };

        const periodLabel = periodLabels[period] || "All Time";

        // Read template
        const templatePath = path.join(__dirname, "../templates/top-artists.html");
        let template = await readFile(templatePath, "utf-8");

        // Replace placeholders
        template = template
            .replace("{{bg}}", theme.bg)
            .replace("{{text}}", theme.text)
            .replace("{{url}}", theme.url)
            .replace("{{scrobble}}", theme.scrobble)
            .replace("{{profile}}", profileHtml)
            .replace("{{period}}", escapeHtml(periodLabel))
            .replace("{{layout}}", escapeHtml(layout))
            .replace("{{itemsPerRow}}", escapeHtml(itemsPerRow.toString()))
            .replace("{{verticalGridStyle}}", verticalGridStyle)
            .replace("{{usePlaceholderImage}}", usePlaceholderImage ? "true" : "false")
            .replace("{{artists}}", artistsHtml);

        return { html: template, status: 200 };
    } catch (err) {
        return {
            html: `<p>Error: ${escapeHtml(err?.message || String(err))}</p>`,
            status: 500
        };
    }
}
import { getCache, setCache } from "../utils/cache.js";

const API_KEY = process.env.LASTFM_API_KEY;
const BASE_URL = "http://ws.audioscrobbler.com/2.0/";
const DEFAULT_IMAGE = "/images/default.jpg";
const MAX_ARTISTS = parseInt(process.env.MAX_ARTISTS || "50");
const MIN_ARTISTS = parseInt(process.env.MIN_ARTISTS || "1");
const MAX_TRACKS = parseInt(process.env.MAX_TRACKS || "50");
const MIN_TRACKS = parseInt(process.env.MIN_TRACKS || "1");
const MAX_ALBUMS = parseInt(process.env.MAX_ALBUMS || "50");
const MIN_ALBUMS = parseInt(process.env.MIN_ALBUMS || "1");

// Encode username for URLs
function encodeUser(username) {
    if (!username) throw new Error("Username is required");
    return encodeURIComponent(username);
}

// Used in /api/top-artists.
export async function getUserTopArtists(username, limit = 5, period = "overall") {
    limit = Math.max(MIN_ARTISTS, Math.min(limit, MAX_ARTISTS));
    const cacheKey = `artists_${username}_${limit}_${period}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const topArtistsUrl = `${BASE_URL}?method=user.gettopartists&user=${encodeUser(username)}&api_key=${API_KEY}&format=json&limit=${limit}&period=${period}`;

    const res = await fetch(topArtistsUrl);
    if (!res.ok) throw new Error("Failed to fetch Last.fm top artists");

    const data = await res.json();

    // Process artists
    data.topartists.artist = data.topartists.artist.map((artist) => ({
        ...artist,
        image: artist.image?.find((i) => i.size === "large")?.["#text"] || DEFAULT_IMAGE
    }));

    setCache(cacheKey, data, 300);
    return data;
}

// Used in /api/top-tracks.
export async function getUserTopTracks(username, limit = 5, period = "overall") {
    limit = Math.max(MIN_TRACKS, Math.min(limit, MAX_TRACKS));
    const cacheKey = `tracks_${username}_${limit}_${period}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const topTracksUrl = `${BASE_URL}?method=user.gettoptracks&user=${encodeUser(username)}&api_key=${API_KEY}&format=json&limit=${limit}&period=${period}`;
    const res = await fetch(topTracksUrl);
    if (!res.ok) throw new Error("Failed to fetch Last.fm top tracks");

    const data = await res.json();

    data.toptracks.track = await Promise.all(
        data.toptracks.track.map(async (t) => {
            try {
                const trackInfoUrl = `${BASE_URL}?method=track.getInfo&api_key=${API_KEY}&artist=${encodeURIComponent(
                    t.artist.name
                )}&track=${encodeURIComponent(t.name)}&format=json`;

                const trackRes = await fetch(trackInfoUrl);
                const trackData = await trackRes.json();

                const image =
                    trackData?.track?.album?.image?.find((i) => i.size === "large")?.["#text"] ||
                    DEFAULT_IMAGE;

                return { ...t, image };
            } catch {
                return { ...t, image: DEFAULT_IMAGE };
            }
        })
    );

    setCache(cacheKey, data, 300);
    return data;
}

// Used in /api/currently-playing.
export async function getCurrentlyPlaying(username) {
    const cacheKey = `currently-playing_${username}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const recentTracksUrl = `${BASE_URL}?method=user.getrecenttracks&user=${encodeUser(username)}&api_key=${API_KEY}&format=json&limit=1`;
    const res = await fetch(recentTracksUrl);
    if (!res.ok) throw new Error("Failed to fetch recent tracks");

    const data = await res.json();
    const track = data.recenttracks?.track?.[0];

    if (!track) {
        const result = { nowPlaying: false, track: null };
        setCache(cacheKey, result, 30);
        return result;
    }

    const nowPlaying = !!(track["@attr"]?.nowplaying === "true");

    const result = {
        nowPlaying,
        track: {
            name: track.name || "",
            url: track.url || "#",
            artist: {
                name: track.artist?.["#text"] || track.artist?.name || "",
                url: track.artist?.url || ""
            },
            album: {
                name: track.album?.["#text"] || "",
                // Construct album URL from artist and album name.
                url: (() => {
                    const albumName = track.album?.["#text"];
                    const artistName = track.artist?.["#text"] || track.artist?.name;
                    if (albumName && artistName) {
                        return `https://www.last.fm/music/${encodeURIComponent(artistName)}/${encodeURIComponent(albumName)}`;
                    }
                    return "";
                })()
            },
            image: track.image?.[1]?.["#text"] || DEFAULT_IMAGE
        }
    };

    setCache(cacheKey, result, 30);
    return result;
}

// Used in /api/top-albums
export async function getUserTopAlbums(username, limit = 5, period = "overall") {
    limit = Math.max(MIN_ALBUMS, Math.min(limit, MAX_ALBUMS));
    const cacheKey = `albums_${username}_${limit}_${period}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const topAlbumsUrl = `${BASE_URL}?method=user.gettopalbums&user=${encodeUser(username)}&api_key=${API_KEY}&format=json&limit=${limit}&period=${period}`;
    const res = await fetch(topAlbumsUrl);
    if (!res.ok) throw new Error("Failed to fetch Last.fm top albums");

    const data = await res.json();

    // Process albums
    data.topalbums.album = data.topalbums.album.map((album) => ({
        ...album,
        image: album.image?.find((i) => i.size === "large")?.["#text"] || DEFAULT_IMAGE
    }));

    setCache(cacheKey, data, 300);
    return data;
}


// Used in /api/stats
export async function getUserStats(username) {
    const cacheKey = `stats_${username}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    // Fetch user info for totals
    const infoUrl = `${BASE_URL}?method=user.getinfo&user=${encodeUser(
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

    // Calculate streak
    const streakData = await calculateCurrentStreak(username);

    const result = {
        totalScrobbles: totalScrobbles.toLocaleString(),
        avgPerDay,
        currentStreak: streakData.days,
        streakStartDate: streakData.startDate,
        streakEndDate: streakData.endDate,
    };

    setCache(cacheKey, result, 30);
    return result;
}

async function calculateCurrentStreak(username) {
    const limit = 200; // Request 200 tracks at once.
    const dayCounts = new Set();
    let page = 1;

    // Collect recent scrobble data
    while (page <= 100) { // Max of 100 pages.
        const url = `${BASE_URL}?method=user.getrecenttracks&user=${encodeUser(
            username
        )}&api_key=${API_KEY}&format=json&limit=${limit}&page=${page}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch recent tracks");
        const data = await res.json();

        const tracks = data.recenttracks.track;
        if (!tracks || tracks.length === 0) break;

        // Process tracks and collect dates
        for (const track of tracks) {
            if (!track.date) continue; // Skip currently playing track (if there is one)
            const ts = parseInt(track.date.uts, 10) * 1000;
            const dateStr = new Date(ts).toISOString().split("T")[0];
            dayCounts.add(dateStr);
        }

        const totalPages = parseInt(data.recenttracks["@attr"].totalPages, 10);
        if (page >= totalPages) break;

        // Stop early if we've collected enough recent data
        const oldestTrack = tracks[tracks.length - 1];
        if (oldestTrack?.date) {
            const oldestTs = parseInt(oldestTrack.date.uts, 10) * 1000;
            const daysOld = (Date.now() - oldestTs) / (1000 * 60 * 60 * 24);
            if (daysOld > 365) break; // Max out at one year.
        }

        page++;
    }

    if (dayCounts.size === 0) {
        return {
            days: 0,
            startDate: null,
            endDate: null
        };
    }

    // Find the most recent scrobble date
    const sortedDates = Array.from(dayCounts).sort().reverse();
    const mostRecentScrobbleDate = sortedDates[0];

    // Calculate streak backwards from most recent scrobble date
    let streak = 0;
    let streakStartDate = null;
    const startDate = new Date(mostRecentScrobbleDate + 'T00:00:00.000Z');

    for (let i = 0; i < 1000; i++) {
        const checkDate = new Date(startDate);
        checkDate.setUTCDate(startDate.getUTCDate() - i);
        const dateStr = checkDate.toISOString().split("T")[0];

        if (dayCounts.has(dateStr)) {
            streak++;
            streakStartDate = dateStr;
        } else {
            // Break here as gap has been found, streak ended.
            break;
        }
    }

    return {
        days: streak,
        startDate: streakStartDate,
        endDate: mostRecentScrobbleDate
    };
}
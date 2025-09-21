const API_KEY = process.env.LASTFM_API_KEY;
const BASE_URL = "http://ws.audioscrobbler.com/2.0/";
import { getCache, setCache } from "../utils/cache.js";

const DEFAULT_IMAGE = "/images/default.jpg";
const MAX_ARTISTS = parseInt(process.env.MAX_ARTISTS || "50");
const MIN_ARTISTS = parseInt(process.env.MIN_ARTISTS || "1");
const MAX_TRACKS = parseInt(process.env.MAX_TRACKS || "50");
const MIN_TRACKS = parseInt(process.env.MIN_TRACKS || "1");
const MAX_ALBUMS = parseInt(process.env.MAX_ALBUMS || "50");
const MIN_ALBUMS = parseInt(process.env.MIN_ALBUMS || "1");

export async function getUserTopArtists(username, limit = 5, period = "overall") {
    limit = Math.max(MIN_ARTISTS, Math.min(limit, MAX_ARTISTS));

    const cacheKey = `artists_${username}_${limit}_${period}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const topArtistsUrl = `${BASE_URL}?method=user.gettopartists&user=${username}&api_key=${API_KEY}&format=json&limit=${limit}&period=${period}`;

    const res = await fetch(topArtistsUrl);
    if (!res.ok) throw new Error("Failed to fetch Last.fm top artists");

    const data = await res.json();

    // Process artists
    const artistsWithImages = data.topartists.artist.map((artist) => {
        const image = artist.image?.find((i) => i.size === "large")?.["#text"] || DEFAULT_IMAGE;
        return { ...artist, image };
    });

    data.topartists.artist = artistsWithImages;
    setCache(cacheKey, data, 300);
    return data;
}

export async function getUserTopTracks(username, limit = 5, period = "overall") {
    limit = Math.max(MIN_TRACKS, Math.min(limit, MAX_TRACKS));

    const cacheKey = `${username}_${limit}_${period}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const topTracksUrl = `${BASE_URL}?method=user.gettoptracks&user=${username}&api_key=${API_KEY}&format=json&limit=${limit}&period=${period}`;

    const res = await fetch(topTracksUrl);
    if (!res.ok) throw new Error("Failed to fetch Last.fm top tracks");

    const data = await res.json();

    const tracksWithImages = await Promise.all(
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

    data.toptracks.track = tracksWithImages;
    setCache(cacheKey, data, 300);
    return data;
}

export async function getCurrentlyPlaying(username) {
    const cacheKey = `currently-playing_${username}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const recentTracksUrl = `${BASE_URL}?method=user.getrecenttracks&user=${username}&api_key=${API_KEY}&format=json&limit=1`;
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
                url: track.album?.url || ""
            },
            image: track.image?.[1]?.["#text"] || DEFAULT_IMAGE
        }
    };

    setCache(cacheKey, result, 30);
    return result;
}

export async function getUserTopAlbums(username, limit = 5, period = "overall") {
    limit = Math.max(MIN_ALBUMS, Math.min(limit, MAX_ALBUMS));

    const cacheKey = `albums_${username}_${limit}_${period}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const topAlbumsUrl = `${BASE_URL}?method=user.gettopalbums&user=${username}&api_key=${API_KEY}&format=json&limit=${limit}&period=${period}`;

    const res = await fetch(topAlbumsUrl);
    if (!res.ok) throw new Error("Failed to fetch Last.fm top albums");

    const data = await res.json();

    // Process albums
    const albumsWithImages = data.topalbums.album.map((album) => {
        const image = album.image?.find((i) => i.size === "large")?.["#text"] || DEFAULT_IMAGE;
        return { ...album, image };
    });

    data.topalbums.album = albumsWithImages;
    setCache(cacheKey, data, 300);
    return data;
}
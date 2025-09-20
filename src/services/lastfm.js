const API_KEY = process.env.LASTFM_API_KEY;
const BASE_URL = "http://ws.audioscrobbler.com/2.0/";
import { getCache, setCache } from "../utils/cache.js";

const DEFAULT_IMAGE = "/images/default.jpg";
const MAX_TRACKS = parseInt(process.env.MAX_TRACKS || "50");
const MIN_TRACKS = parseInt(process.env.MIN_TRACKS || "1");

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
                    trackData?.track?.album?.image?.find((i) => i.size === "medium")?.["#text"] ||
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
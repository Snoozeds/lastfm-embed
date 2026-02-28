export const config = { runtime: "nodejs" };
import { currentlyPlayingJsonRoute } from "../src/routes/currently-playing.js";
import { checkRateLimit } from "../src/utils/rate-limit.js";

export default async function handler(req, res) {
    const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    if (!checkRateLimit(ip)) {
        res.statusCode = 429;
        res.end("Too Many Requests");
        return;
    }

    const result = await currentlyPlayingJsonRoute(req);

    res.setHeader("Content-Type", "application/json");
    res.statusCode = result.status || 200;
    res.end(JSON.stringify(result.json));
}
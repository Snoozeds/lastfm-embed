export const config = { runtime: "nodejs" };
import topTracksRoute from "../src/routes/top-tracks.js";
import { checkRateLimit } from "../src/utils/rate-limit.js";

export default async function handler(req, res) {
    const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    if (!checkRateLimit(ip)) {
        res.statusCode = 429;
        res.end("Too Many Requests");
        return;
    }
    
    const result = await topTracksRoute(req);
    
    // Handle error cases
    if (result.error) {
        res.statusCode = result.status || 500;
        res.setHeader("Content-Type", "text/plain");
        res.end(result.error);
        return;
    }
    
    // Return HTML content
    res.setHeader("Content-Type", "text/html");
    res.statusCode = result.status || 200;
    res.end(result.html);
}
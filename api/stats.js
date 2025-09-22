export const config = { runtime: "nodejs" };
import statsRoute from "../src/routes/stats.js";
import { checkRateLimit } from "../src/utils/rate-limit.js";

export default async function handler(req, res) {
    const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    if (!checkRateLimit(ip)) {
        res.statusCode = 429;
        res.end("Too Many Requests");
        return;
    }

    const result = await statsRoute(req);

    // Handle error cases
    if (result.error) {
        res.statusCode = result.status || 500;
        res.setHeader("Content-Type", "text/plain");
        res.end(result.error);
        return;
    }

    // Handle JSON response (for streak-only requests, used for when we display "Loading streak...")
    if (result.json) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = result.status || 200;
        res.end(JSON.stringify(result.json));
        return;
    }

    // Return HTML content
    res.setHeader("Content-Type", "text/html");
    res.statusCode = result.status || 200;
    res.end(result.html);
}
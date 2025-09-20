import { themes } from "../src/lib/themes.js";
import { checkRateLimit } from "../src/utils/rate-limit.js";
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
    const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
    if (!checkRateLimit(ip)) return res.status(429).end("Too Many Requests");

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(themes));
}
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "url";
import "dotenv/config";

import handlerCurrentlyPlaying from "../api/currently-playing.js";
import handlerThemes from "../api/themes.js";
import handlerTopArtists from "../api/top-artists.js";
import handlerTopTracks from "../api/top-tracks.js";
import handlerTopAlbums from "../api/top-albums.js";
import handlerStats from "../api/stats.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "../public");

const server = http.createServer((req, res) => {
  const { pathname } = parse(req.url || "/", true);

  // API routes
  if (pathname === "/api/currently-playing") return handlerCurrentlyPlaying(req, res);
  if (pathname === "/api/themes") return handlerThemes(req, res);
  if (pathname === "/api/top-artists") return handlerTopArtists(req, res);
  if (pathname === "/api/top-tracks") return handlerTopTracks(req, res);
  if (pathname === "/api/top-albums") return handlerTopAlbums(req, res);
  if (pathname === "/api/stats") return handlerStats(req, res);

  // Static files
  const requestedPath = pathname === "/" ? "index.html" : pathname;
  const unsafePath = path.join(publicDir, requestedPath);

  let filePath;
  try {
    filePath = fs.realpathSync(path.resolve(unsafePath));
    if (!filePath.startsWith(publicDir)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
  } catch {
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 404;
      res.end("Not Found");
    } else {
      res.statusCode = 200;
      res.end(content);
    }
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

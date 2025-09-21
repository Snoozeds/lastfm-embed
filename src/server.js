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

  // Static files
  let filePath = path.join(publicDir, pathname === "/" ? "index.html" : pathname);
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

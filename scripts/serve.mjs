import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);
const port = Number(process.env.SKY_PORT || 4173);
if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("Build the game first: npm run build");
  process.exit(1);
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
const server = http.createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (pathname === "/sky-health") {
    res.setHeader("Content-Type", "application/json");
    res.end('{"game":"sky-numeracy","version":1}');
    return;
  }
  let target = path.resolve(root, "." + pathname);
  if (!target.startsWith(root + path.sep) && target !== root) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (target === root || !path.extname(target))
    target = path.join(root, "index.html");
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.setHeader(
      "Content-Type",
      mime[path.extname(target)] || "application/octet-stream",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Cache-Control",
      path.extname(target) === ".html" ? "no-cache" : "public, max-age=86400",
    );
    res.setHeader("Content-Length", stat.size);
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(target).pipe(res);
  });
});
server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    http
      .get(`http://localhost:${port}/sky-health`, (r) => {
        let b = "";
        r.on("data", (x) => (b += x));
        r.on("end", () => {
          if (b.includes("sky-numeracy")) {
            console.log(
              `Sky Numeracy is already running: http://localhost:${port}`,
            );
            if (process.argv.includes("--open"))
              spawn("open", [`http://localhost:${port}`], { stdio: "ignore" });
            process.exit(0);
          } else {
            console.error("Port is in use. Set SKY_PORT to another port.");
            process.exit(1);
          }
        });
      })
      .on("error", () => process.exit(1));
  } else {
    console.error(e.message);
    process.exit(1);
  }
});
server.listen(port, "0.0.0.0", () => {
  console.log(
    `\nSky Numeracy · Ready for take-off!\nComputer: http://localhost:${port}`,
  );
  for (const entries of Object.values(os.networkInterfaces()))
    for (const addr of entries || [])
      if (addr.family === "IPv4" && !addr.internal)
        console.log(`Tablet on the same Wi-Fi: http://${addr.address}:${port}`);
  console.log(
    "\nKeep this window open while playing. Press Control+C to stop.\n",
  );
  if (process.argv.includes("--open"))
    spawn("open", [`http://localhost:${port}`], { stdio: "ignore" });
});

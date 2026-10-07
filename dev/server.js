// Zero-dependency local dev server for nodelbrot.
//
//   node dev/server.js [--port 8090] [--open] [--built [dir]]
//
// Serves src/ as it is (the browser loads the ES modules directly, so there is no build step), with
// caching off so edits show up on reload, injects the performance HUD (dev/perfHud.js) into the page,
// and records benchmark results to dev/bench-results.log.
//
// With --built, serves the output of build/build.js instead (default dir: latest) as plain static
// files, as any web server would, adding only the HUD to the page.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const devDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(devDir, "..");
const args = process.argv.slice(2);
const portArg = args.indexOf("--port");
const port = Number(portArg !== -1 ? args[portArg + 1] : process.env.PORT) || 8090;
const shouldOpen = args.includes("--open");
const builtArg = args.indexOf("--built");
const builtDirArg = builtArg !== -1 && args[builtArg + 1] && !args[builtArg + 1].startsWith("--") ? args[builtArg + 1] : "latest";
const builtDir = builtArg === -1 ? null : path.resolve(root, builtDirArg);
const page = builtDir ? path.join(builtDir, "mandelbrotExplorer.html") : path.join(root, "src/index.html");
const resultsLog = path.join(devDir, "bench-results.log");

// URL prefix -> directory. Longest prefix first.
const staticDirs = [["/dev/", devDir], ["/", builtDir || path.join(root, "src")]];

const contentTypes = {
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".html": "text/html; charset=utf-8",
    ".map": "application/json; charset=utf-8"
};

const hudScript = '<script src="/dev/perfHud.js"></script>\n';

function homePage() {
    return fs.readFileSync(page, "utf8").replace("</head>", hudScript + "</head>");
}

function send(res, status, type, body) {
    res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(body);
}

function serveStatic(urlPath, res) {
    const [prefix, dir] = staticDirs.find(([p]) => urlPath.startsWith(p));
    const file = path.resolve(dir, decodeURIComponent(urlPath.slice(prefix.length)));
    if (!file.startsWith(dir + path.sep)) return false;
    const type = contentTypes[path.extname(file)];
    if (!type) return false;
    fs.readFile(file, (err, data) => err ? send(res, 404, "text/plain", "Not found") : send(res, 200, type, data));
    return true;
}

function gitVersion() {
    try {
        const git = (gitArgs) => execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" }).trim();
        return git(["rev-parse", "--short", "HEAD"]) + (git(["status", "--porcelain", "--", "src"]) ? "-dirty" : "");
    } catch {
        return "unknown";
    }
}

function recordBenchmark(req, res) {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
        let r;
        try {
            r = JSON.parse(body);
        } catch {
            return send(res, 400, "text/plain", "Bad JSON");
        }
        const line = [
            new Date().toISOString(),
            gitVersion() + (builtDir ? "+built" : ""),
            "view=" + r.view,
            "target=" + r.target,
            "time=" + (r.ms / 1000).toFixed(2) + "s",
            "depth/s=" + Math.round(r.target / (r.ms / 1000)),
            "avgFrame=" + r.avgFrameMs.toFixed(1) + "ms",
            "frames=" + r.frames,
            r.browser
        ].join("  ");
        console.log("[bench] " + line);
        fs.appendFileSync(resultsLog, line + "\n");
        send(res, 204, "text/plain", "");
    });
}

const server = http.createServer((req, res) => {
    const urlPath = req.url.split("?")[0];
    if (req.method === "POST" && urlPath === "/dev/bench") return recordBenchmark(req, res);
    if (urlPath === "/" || urlPath === "/" + path.basename(page)) {
        try {
            return send(res, 200, contentTypes[".html"], homePage());
        } catch (e) {
            return send(res, 500, "text/plain", e.stack);
        }
    }
    if (!serveStatic(urlPath, res)) send(res, 404, "text/plain", "Not found");
});

server.listen(port, "127.0.0.1", () => {
    const url = "http://localhost:" + port + "/";
    console.log("nodelbrot dev server running at " + url + (builtDir ? " (serving " + path.relative(root, builtDir) + "/)" : ""));
    console.log("Benchmark results are appended to " + path.relative(root, resultsLog));
    if (shouldOpen) {
        const [cmd, cmdArgs] = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
            : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
        spawn(cmd, cmdArgs, { stdio: "ignore", detached: true }).unref();
    }
});

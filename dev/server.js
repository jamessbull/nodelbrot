// Zero-dependency local dev server for nodelbrot.
//
//   node dev/server.js [--port 8090] [--open]
//
// Serves the explorer page with the same URL layout as the production router
// (src/routing/nodelbrotRouter.js), disables caching so edits show up on reload,
// injects the performance HUD (dev/perfHud.js) and records benchmark results
// to dev/bench-results.log.
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const portArg = args.indexOf("--port");
const port = Number(portArg !== -1 ? args[portArg + 1] : process.env.PORT) || 8090;
const shouldOpen = args.includes("--open");
const resultsLog = path.join(__dirname, "bench-results.log");

// URL prefix -> directory, mirroring nodelbrotRouter.js. Longest prefix wins.
const staticDirs = [
    ["/js/export/", "src/client/export"],
    ["/js/messages/", "src/client/messages"],
    ["/js/ui/", "src/client/ui"],
    ["/js/actions/", "src/client/ui/actions"],
    ["/js/", "src/client"],
    ["/specs/", "test/client/jasmine/spec"],
    ["/dev/", "dev"]
];

const contentTypes = {
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".html": "text/html; charset=utf-8"
};

// The live page loads PayPal's checkout script; stub it so the dev page works offline
// and never talks to PayPal.
const paypalStub = "<script>window.paypal = {Button: {render: function () {}}};</script>";

function readTemplate(name) {
    return fs.readFileSync(path.join(root, "src/view/templates", name + ".hbl"), "utf8");
}

// The templates only use {{{name}}} substitution, so handlebars isn't needed here.
function fill(template, context) {
    return template.replace(/\{\{\{(\w+)\}\}\}/g, (match, key) => context[key] || "");
}

function homePage() {
    const head = readTemplate("homePage/head") + '\n<script src="/dev/perfHud.js"></script>\n';
    const body = readTemplate("homePage/body")
        .replace(/<script src="https:\/\/www\.paypalobjects\.com[^"]*"><\/script>/, paypalStub);
    return fill(readTemplate("html"), { head: head, body: body });
}

function send(res, status, type, body) {
    res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(body);
}

function serveStatic(urlPath, res) {
    const match = staticDirs.find(([prefix]) => urlPath.startsWith(prefix));
    if (!match) return false;
    const dir = path.join(root, match[1]);
    const file = path.resolve(dir, decodeURIComponent(urlPath.slice(match[0].length)));
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
    } catch (e) {
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
        } catch (e) {
            return send(res, 400, "text/plain", "Bad JSON");
        }
        const line = [
            new Date().toISOString(),
            gitVersion(),
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
    if (urlPath === "/" || urlPath === "/index.html") {
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
    console.log("nodelbrot dev server running at " + url);
    console.log("Benchmark results are appended to " + path.relative(root, resultsLog));
    if (shouldOpen) {
        const [cmd, cmdArgs] = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
            : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
        spawn(cmd, cmdArgs, { stdio: "ignore", detached: true }).unref();
    }
});

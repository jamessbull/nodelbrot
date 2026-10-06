// Builds the explorer into two files that can be served from any folder of any static web server:
//
//   mandelbrotExplorer.html    the page
//   mandelbrotExplorer.min.js  all the JavaScript, minified: the page code and the web worker code
//
//   node build/build.js [--out <dir>] [--source-map]      (default out: latest)
//
// The JavaScript file is both the page's script and the workers' script: run by a worker it starts
// the worker, otherwise it tells the page to start workers from itself. The scripts and their order
// come from the development page (src/view/templates/homePage/head.hbl) and worker
// (src/client/unifiedworker.js), so the build always matches what the dev server runs.
"use strict";

const fs = require("fs");
const path = require("path");
const UglifyJS = require("uglify-js");
const { root, sourceFor } = require("./sourcePaths");

const args = process.argv.slice(2);
const outArg = args.indexOf("--out");
const outDir = path.resolve(root, outArg !== -1 ? args[outArg + 1] : "latest");
const withSourceMap = args.includes("--source-map");
const htmlName = "mandelbrotExplorer.html";
const jsName = "mandelbrotExplorer.min.js";

function read(file) {
    return fs.readFileSync(path.join(root, file), "utf8");
}

function sourceOf(url) {
    const file = sourceFor(url);
    if (!file) throw new Error("Don't know where " + url + " comes from");
    return file;
}

// <script src="/js/..."></script> tags in the development page head, which load the page code.
const pageScriptTag = /[ \t]*<script src="(\/js\/[^"]+)"><\/script>\r?\n?/g;

function pageScripts(head) {
    return Array.from(head.matchAll(pageScriptTag), (m) => sourceOf(m[1]));
}

// The development worker loads its code with importScripts, then starts itself.
function workerParts() {
    const worker = read("src/client/unifiedworker.js");
    const importCall = worker.match(/importScripts\(([\s\S]*?)\);/);
    if (!importCall) throw new Error("No importScripts call in src/client/unifiedworker.js");
    const scripts = Array.from(importCall[1].matchAll(/['"]([^'"]+)['"]/g), (m) => sourceOf(m[1]));
    return { scripts: scripts, start: worker.slice(importCall.index + importCall[0].length) };
}

function bundle(head) {
    const worker = workerParts();
    const files = [];
    pageScripts(head).concat(worker.scripts).forEach((file) => {
        if (!files.includes(file)) files.push(file);
    });
    const sources = {};
    files.forEach((file) => { sources[file] = read(file); });
    sources["(start)"] = [
        "if (typeof importScripts === \"function\") {",
        worker.start,
        "} else if (typeof document !== \"undefined\" && document.currentScript) {",
        "    jim.worker.url = document.currentScript.src;",
        "}"
    ].join("\n");
    return { files: files, sources: sources };
}

function minify(sources) {
    // The output is a classic script, not an ES module. uglify-js assumes a module by default, and
    // since modules are always strict it would drop the code's "use strict" directives.
    const options = { module: false };
    if (withSourceMap) {
        options.sourceMap = { filename: jsName, url: jsName + ".map", includeSources: true };
    }
    const result = UglifyJS.minify(sources, options);
    if (result.error) throw result.error;
    return result;
}

function page(head, body) {
    const builtHead = head.replace(pageScriptTag, "") + "<script src=\"" + jsName + "\"></script>\n";
    return read("src/view/templates/html.hbl")
        .replace("{{{head}}}", () => builtHead)
        .replace("{{{body}}}", () => body);
}

function size(bytes) {
    return (bytes / 1024).toFixed(1) + " KB";
}

const head = read("src/view/templates/homePage/head.hbl");
const body = read("src/view/templates/homePage/body.hbl");
const js = bundle(head);
const minified = minify(js.sources);
const html = page(head, body);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, htmlName), html);
fs.writeFileSync(path.join(outDir, jsName), minified.code);
if (withSourceMap) fs.writeFileSync(path.join(outDir, jsName + ".map"), minified.map);

const unminified = Object.values(js.sources).reduce((total, source) => total + source.length, 0);
console.log("Bundled " + js.files.length + " scripts into " + path.relative(root, outDir) + path.sep);
console.log("  " + htmlName + "  " + size(html.length));
console.log("  " + jsName + "  " + size(minified.code.length) + " (from " + size(unminified) + ")" +
    (withSourceMap ? " + source map" : ""));

// Builds the explorer into two files that can be served from any folder of any static web server:
//
//   mandelbrotExplorer.html    the page
//   mandelbrotExplorer.min.js  all the JavaScript, minified: the page code and the web worker code
//
//   node build/build.js [--out <dir>] [--source-map]      (default out: latest)
//
// The JavaScript file is src/client/main.js bundled by esbuild into one ES module, which is both the
// page's script and the workers' script (see main.js). The page is src/index.html, loading it instead.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outArg = args.indexOf("--out");
const outDir = path.resolve(root, outArg !== -1 ? args[outArg + 1] : "latest");
const withSourceMap = args.includes("--source-map");
const htmlName = "mandelbrotExplorer.html";
const jsName = "mandelbrotExplorer.min.js";

const result = await esbuild.build({
    entryPoints: [path.join(root, "src/client/main.js")],
    outfile: path.join(outDir, jsName),
    bundle: true,
    format: "esm",
    minify: true,
    target: "es2022",
    sourcemap: withSourceMap,
    legalComments: "none",
    metafile: true
});

const sourceScript = '<script type="module" src="client/main.js"></script>';
const page = fs.readFileSync(path.join(root, "src/index.html"), "utf8");
if (!page.includes(sourceScript)) throw new Error("src/index.html doesn't load " + "client/main.js as expected");
const html = page.replace(sourceScript, '<script type="module" src="' + jsName + '"></script>');
fs.writeFileSync(path.join(outDir, htmlName), html);

const size = (bytes) => (bytes / 1024).toFixed(1) + " KB";
const inputs = Object.values(result.metafile.inputs);
const sourceBytes = inputs.reduce((total, input) => total + input.bytes, 0);
console.log("Bundled " + inputs.length + " modules into " + path.relative(root, outDir) + path.sep);
console.log("  " + htmlName + "  " + size(html.length));
console.log("  " + jsName + "  " + size(fs.statSync(path.join(outDir, jsName)).size) + " (from " + size(sourceBytes) + ")" +
    (withSourceMap ? " + source map" : ""));

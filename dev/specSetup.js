// Jasmine helper for the client specs (npm test): loads the page's scripts, and the scripts only the
// worker uses, as globals in Node, in the order the development page and worker load them, so the
// specs in test/client/jasmine/spec run as they would in the browser. Specs that need the page itself
// get a minimal document with createElement.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { root, sourceFor } = require("../build/sourcePaths");

globalThis.self = globalThis;
globalThis.document = globalThis.document || {
    createElement: function () {
        return { innerText: "", innerHTML: "", textContent: "", style: {}, classList: { contains: () => false } };
    }
};

function scriptsIn(file, pattern) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    return Array.from(text.matchAll(pattern), (m) => sourceFor(m[1]));
}

const pageScripts = scriptsIn("src/view/templates/homePage/head.hbl", /<script src="(\/js\/[^"]+)"><\/script>/g);
const workerScripts = scriptsIn("src/client/unifiedworker.js", /'(\/js\/[^']+)'/g);
new Set(pageScripts.concat(workerScripts)).forEach((file) => {
    vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
});

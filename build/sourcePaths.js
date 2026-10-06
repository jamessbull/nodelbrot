// Where the /js/ URLs used by the development page and worker live under the project root,
// mirroring src/routing/nodelbrotRouter.js. Shared by the dev server and the build.
"use strict";

const path = require("path");

const root = path.resolve(__dirname, "..");

// URL prefix -> directory. Longest prefix first.
const jsDirs = [
    ["/js/export/", "src/client/export"],
    ["/js/messages/", "src/client/messages"],
    ["/js/ui/", "src/client/ui"],
    ["/js/actions/", "src/client/ui/actions"],
    ["/js/", "src/client"]
];

// The source file for a /js/ URL, relative to the project root, or undefined.
function sourceFor(url) {
    const match = jsDirs.find(([prefix]) => url.startsWith(prefix));
    return match ? path.posix.join(match[1], url.slice(match[0].length)) : undefined;
}

module.exports = { root: root, jsDirs: jsDirs, sourceFor: sourceFor };

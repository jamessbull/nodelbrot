import { rectangle } from "./geometry.js";

// Reads a bookmark link's data, the text after "#": {location: {x, y, w, h}, nodes, blend}, where nodes
// are palette nodes {position, colourDesc: {h, s, v}}. Returns null if it can't be read or doesn't make
// sense, as links get cut short or edited. Links saved before the blend was added have none (so rgb).
export function parseBookmark(text) {
    let info;
    try {
        info = JSON.parse(decodeURI(text));
    } catch {
        return null;
    }
    function isNumber(n) {
        return typeof n === "number" && isFinite(n);
    }
    function isColourValue(n) {
        return n !== undefined && n !== null && isFinite(parseFloat(n));
    }
    const location = info && info.location;
    if (!location || !isNumber(location.x) || !isNumber(location.y) || !isNumber(location.w) || !isNumber(location.h) ||
            location.w <= 0 || location.h <= 0) {
        return null;
    }
    const nodesMakeSense = Array.isArray(info.nodes) && info.nodes.every(function (node) {
        const colour = node && node.colourDesc;
        return Boolean(node) && isNumber(node.position) && node.position >= 0 && node.position <= 1 &&
            colour && isColourValue(colour.h) && isColourValue(colour.s) && isColourValue(colour.v);
    });
    if (!nodesMakeSense) {
        return null;
    }
    return {location: {x: location.x, y: location.y, w: location.w, h: location.h}, nodes: info.nodes, blend: info.blend};
}

export function createBookmarks(bookmarkButton, state, colourGradientui, _events, notice) {
    const on = _events.listenTo;
    let justBookmarked = false;
    let palette;
    const newLocation = function (pos, nodes, blend) {
        return {
            location: pos,
            nodes: nodes,
            blend: blend
        };
    };

    on(_events.paletteChanged, function (_palette) {
        palette = _palette;
    });

    const defaultMandelbrotInfo = function () {
        return newLocation({x:-2.5,y:-1, w:3.5, h: 2}, palette.toNodeList(), palette.blend());
    };

    const currentMandelbrotInfo = function() {
        const text = window.location.hash.substring(1);
        if (text.length === 0) {
            return defaultMandelbrotInfo();
        }
        const info = parseBookmark(text);
        if (!info) {
            notice.show("That link couldn't be read, so this is the starting view.");
            return defaultMandelbrotInfo();
        }
        return info;
    };

    const changeCurrentMandelbrotStateToMatchUrl = function () {
        const mandelbrotInfo = currentMandelbrotInfo();
        palette.fromNodeList(mandelbrotInfo.nodes);
        palette.setBlend(mandelbrotInfo.blend);
        colourGradientui.rebuildMarkers(true);
        state.showView(rectangle(mandelbrotInfo.location));
        // Tell everything about the link's palette, and restart rendering in case it had stopped (as it
        // has if a link is opened in the same tab).
        _events.fire(_events.paletteChanged, palette);
        _events.fire(_events.restart);
    };

    window.onhashchange = function () {
        if (!justBookmarked) {
            changeCurrentMandelbrotStateToMatchUrl();
        }
        justBookmarked = false;
    };

    const currentMandelbrotInfoToUrl = function () {
        const a = state.getExtents();
        const x = a.topLeft().x;
        const y = a.topLeft().y;
        const w = a.width();
        const h = a.height();
        const pos = {x:x, y:y, w:w, h:h};
        const nodes = palette.toNodeList();

        const mandelbrotInfo = newLocation(pos, nodes, palette.blend());
        const hash = encodeURI(JSON.stringify(mandelbrotInfo));
        return window.location.origin + window.location.pathname + "#" + hash;
    };

    bookmarkButton.onclick = function () {
        justBookmarked = true;
        window.location = currentMandelbrotInfoToUrl();
    };

    return {
        changeLocation: changeCurrentMandelbrotStateToMatchUrl
    };
}

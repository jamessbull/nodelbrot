import { describeCentre } from "./view.js";

// A decimal, such as the centre of a view in a link.
const decimal = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

// Reads a bookmark link's data, the text after "#", as {area: {x, y, w, h}, nodes, blend}: the area of
// the complex plane shown, w x h centred on (x, y), and the palette, nodes {position, colourDesc: {h, s,
// v}} and blend. Returns null if it can't be read or doesn't make sense, as links get cut short or
// edited.
//
// Links hold the area as view: {x, y, w, h}, with the centre as decimal strings, precise enough for deep
// zooms. Links saved before that hold it as location: {x, y, w, h} with x, y the top left, in doubles.
// Links saved before the blend was added have none (so rgb).
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
    let area = null;
    const view = info && info.view;
    const location = info && info.location;
    if (view) {
        if (decimal.test(view.x) && decimal.test(view.y) && isNumber(view.w) && isNumber(view.h) && view.w > 0 && view.h > 0) {
            area = {x: view.x, y: view.y, w: view.w, h: view.h};
        }
    } else if (location && isNumber(location.x) && isNumber(location.y) && isNumber(location.w) && isNumber(location.h) &&
            location.w > 0 && location.h > 0) {
        area = {x: location.x + (location.w / 2), y: location.y + (location.h / 2), w: location.w, h: location.h};
    }
    if (!area) {
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
    return {area: area, nodes: info.nodes, blend: info.blend};
}

export function createBookmarks({bookmarkButton, state, events, notice}) {
    const on = events.listenTo;
    let justBookmarked = false;
    let palette;
    on(events.paletteChanged, function (newPalette) {
        palette = newPalette;
    });

    const defaultMandelbrotInfo = function () {
        return {area: {x: -0.75, y: 0, w: 3.5, h: 2}, nodes: palette.toNodeList(), blend: palette.blend()};
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
        state.showArea(mandelbrotInfo.area);
        // Tell everything about the link's palette, and restart rendering in case it had stopped (as it
        // has if a link is opened in the same tab).
        events.fire(events.paletteChanged, palette);
        events.fire(events.restart);
    };

    window.onhashchange = function () {
        if (!justBookmarked) {
            changeCurrentMandelbrotStateToMatchUrl();
        }
        justBookmarked = false;
    };

    const currentMandelbrotInfoToUrl = function () {
        const centre = describeCentre(state.getView());
        const area = state.getArea();
        const mandelbrotInfo = {
            view: {x: centre.x, y: centre.y, w: area.width(), h: area.height()},
            nodes: palette.toNodeList(),
            blend: palette.blend()
        };
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

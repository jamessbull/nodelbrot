namespace("jim.mandelbrot.bookmark");

// Reads a bookmark link's data, the text after "#": {location: {x, y, w, h}, nodes, blend}, where nodes
// are palette nodes {position, colourDesc: {h, s, v}}. Returns null if it can't be read or doesn't make
// sense, as links get cut short or edited. Links saved before the blend was added have none (so rgb).
jim.mandelbrot.bookmark.parse = function (text) {
    "use strict";
    var info;
    try {
        info = JSON.parse(decodeURI(text));
    } catch (e) {
        return null;
    }
    function isNumber(n) {
        return typeof n === "number" && isFinite(n);
    }
    function isColourValue(n) {
        return n !== undefined && n !== null && isFinite(parseFloat(n));
    }
    var location = info && info.location;
    if (!location || !isNumber(location.x) || !isNumber(location.y) || !isNumber(location.w) || !isNumber(location.h) ||
            location.w <= 0 || location.h <= 0) {
        return null;
    }
    var nodesMakeSense = Array.isArray(info.nodes) && info.nodes.every(function (node) {
        var colour = node && node.colourDesc;
        return Boolean(node) && isNumber(node.position) && node.position >= 0 && node.position <= 1 &&
            colour && isColourValue(colour.h) && isColourValue(colour.s) && isColourValue(colour.v);
    });
    if (!nodesMakeSense) {
        return null;
    }
    return {location: {x: location.x, y: location.y, w: location.w, h: location.h}, nodes: info.nodes, blend: info.blend};
};

jim.mandelbrot.bookmark.create = function (bookmarkButton, state, colourGradientui, _events, uiCanvas) {

    "use strict";
    var justBookmarked = false;
    var palette;
    var newLocation = function (pos, nodes, blend) {
        return {
            location: pos,
            nodes: nodes,
            blend: blend
        };
    };

    on(_events.paletteChanged, function (_palette) {
        palette = _palette;
    });

    var defaultMandelbrotInfo = function () {
        return newLocation({x:-2.5,y:-1, w:3.5, h: 2}, palette.toNodeList(), palette.blend());
    };

    // Shows a message across the top of the image for a few seconds.
    function showNotice(message) {
        var context = uiCanvas.getContext('2d');
        context.font = "14px courier";
        context.strokeStyle = "rgba(0,0,0,255)";
        context.fillStyle = "rgba(255,255,255,255)";
        context.lineWidth = 3;
        context.strokeText(message, 15, 20);
        context.fillText(message, 15, 20);
        setTimeout(function () {
            context.clearRect(0, 0, uiCanvas.width, 30);
        }, 5000);
    }

    var currentMandelbrotInfo = function() {
        var text = window.location.hash.substring(1);
        if (text.length === 0) {
            return defaultMandelbrotInfo();
        }
        var info = jim.mandelbrot.bookmark.parse(text);
        if (!info) {
            showNotice("That link couldn't be read, so this is the starting view.");
            return defaultMandelbrotInfo();
        }
        return info;
    };

    var changeCurrentMandelbrotStateToMatchUrl = function () {
        var mandelbrotInfo = currentMandelbrotInfo();
        palette.fromNodeList(mandelbrotInfo.nodes);
        palette.setBlend(mandelbrotInfo.blend);
        colourGradientui.rebuildMarkers(true);
        state.setExtents(jim.rectangle.create(mandelbrotInfo.location));
    };

    window.onhashchange = function () {
        if (!justBookmarked) {
            changeCurrentMandelbrotStateToMatchUrl();
        }
        justBookmarked = false;
    };

    var currentMandelbrotInfoToUrl = function () {
        var a = state.getExtents();
        var x = a.topLeft().x;
        var y = a.topLeft().y;
        var w = a.width();
        var h = a.height();
        var pos = {x:x, y:y, w:w, h:h};
        var nodes = palette.toNodeList();

        var mandelbrotInfo = newLocation(pos, nodes, palette.blend());
        var hash = encodeURI(JSON.stringify(mandelbrotInfo));
        return window.location.origin + window.location.pathname + "#" + hash;
    };

    bookmarkButton.onclick = function () {
        justBookmarked = true;
        window.location = currentMandelbrotInfoToUrl();
    };

    return {
        changeLocation: changeCurrentMandelbrotStateToMatchUrl
    };
};
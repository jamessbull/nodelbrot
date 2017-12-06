namespace("jim.mandelbrot.bookmark");
jim.mandelbrot.bookmark.create = function (bookmarkButton, mandelbrot, colourGradientui, _events) {

    "use strict";
    var justBookmarked = false;
    var palette;
    var newLocation = function (pos, nodes) {
        return {
            location: pos,
            nodes: nodes
        };
    };

    on(_events.paletteChanged, function (_palette) {
        palette = _palette;
    });

    var defaultMandelbrotInfo = function () {
        return newLocation({x:-2.5,y:-1, w:3.5, h: 2}, palette.toNodeList());
    };

    var mandelbrotInfoFromUrl = function () {
        var decoded = JSON.parse(decodeURI(window.location.hash.substring(1)));
        return newLocation(decoded.location, decoded.nodes);
    };

    var currentMandelbrotInfo = function() {
        var hash = decodeURI(window.location.hash);
        return hash.length > 1 ? mandelbrotInfoFromUrl() : defaultMandelbrotInfo();
    };

    var changeCurrentMandelbrotStateToMatchUrl = function () {
        var mandelbrotInfo = currentMandelbrotInfo();
        palette.fromNodeList(mandelbrotInfo.nodes);
        colourGradientui.rebuildMarkers(true);
        mandelbrot.state().setExtents(jim.rectangle.create(mandelbrotInfo.location));
    };

    window.onhashchange = function () {
        if (!justBookmarked) {
            changeCurrentMandelbrotStateToMatchUrl();
        }
        justBookmarked = false;
    };

    var currentMandelbrotInfoToUrl = function () {
        var a = mandelbrot.state().getExtents();
        var x = a.topLeft().x;
        var y = a.topLeft().y;
        var w = a.width();
        var h = a.height();
        var pos = {x:x, y:y, w:w, h:h};
        var nodes = palette.toNodeList();

        var mandelbrotInfo = newLocation(pos, nodes);
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
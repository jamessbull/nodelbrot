namespace("jim.mandelbrot.bookmark");
jim.mandelbrot.bookmark.create = function (bookmarkButton, currentMandelbrotSet, colourGradientui) {

    "use strict";
    var justBookmarked = false;

    var newLocation = function (pos, nodes) {
        return {
            location: jim.rectangle.create(pos.x, pos.y, pos.w, pos.h),
            nodes: nodes
        };
    };

    var defaultMandelbrotInfo = function () {
        return newLocation({x:-2.5,y:-1, w:3.5, h: 2}, currentMandelbrotSet.palette().toNodeList());
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
        currentMandelbrotSet.palette().fromNodeList(mandelbrotInfo.nodes);
        colourGradientui.rebuildMarkers();
        currentMandelbrotSet.state().setExtents(mandelbrotInfo.location);
    };

    window.onhashchange = function () {
        if (!justBookmarked) {
            changeCurrentMandelbrotStateToMatchUrl();
        }
        justBookmarked = false;
    };

    var currentMandelbrotInfoToUrl = function () {
        var a = currentMandelbrotSet.state().getExtents();
        var location = newLocation({x: a.topLeft().x,y: a.topLeft().y,w: a.width(),h: a.height()}, currentMandelbrotSet.palette().toNodeList());
        var hash = encodeURI(JSON.stringify(location));
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
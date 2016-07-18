namespace("jim.mandelbrot.bookmark");
jim.mandelbrot.bookmark.create = function (bookmarkButton,  areaNotifier, currentMandelbrotSet, colourGradientui) {

    "use strict";
    var changeLocation = function() {
        var hash = decodeURI(window.location.hash);
        var initialState = {};
        console.log("");
        if (hash.length >1) {
            var initialArgs = JSON.parse(decodeURI(window.location.hash.substring(1)));
            initialState.location = jim.rectangle.create(initialArgs.position.x, initialArgs.position.y, initialArgs.position.w, initialArgs.position.h);
            initialState.nodelist = initialArgs.nodes;

        } else {
            initialState.location = jim.rectangle.create(-2.5, -1, 3.5, 2);
            initialState.nodelist = currentMandelbrotSet.palette().toNodeList();
        }

        currentMandelbrotSet.palette().fromNodeList(initialState.nodelist);
        colourGradientui.rebuildMarkers();
        currentMandelbrotSet.state().setExtents(initialState.location);
        areaNotifier.notify({x:  initialState.location.topLeft().x, y:  initialState.location.topLeft().y, w:  initialState.location.width(), h:  initialState.location.height()});
    };

    window.onhashchange = function () {
        changeLocation();
    };

    bookmarkButton.onclick = function () {
        var a = currentMandelbrotSet.state().getExtents();
        areaNotifier.notify({x: a.topLeft().x,y: a.topLeft().y,w: a.width(),h: a.height()});
        areaNotifier.notifyPalette(currentMandelbrotSet.palette().toNodeList());
        window.location = areaNotifier.currentLocation;
    };

    return {
        changeLocation: changeLocation
    };
};
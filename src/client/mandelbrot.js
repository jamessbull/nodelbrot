namespace("jim.defaults");
jim.defaults.mandelbrotExtents = jim.rectangle.create(-2.5, -1, 3.5, 2);

namespace("jim.mandelbrotImage");
jim.mandelbrotImage.create = function () {
    "use strict";
    var startingExtent = jim.rectangle.create(-2.5, -1, 3.5, 2),
        state = jim.mandelbrot.state.create(700, 400, startingExtent),
        segments2 = jim.segment.createSegments(700, 400, 4, state),
        screen = jim.screen.create({segments: segments2});

    return {
        canvas: function () {
            return screen.canvas;
        },
        draw: function () {
            screen.draw();
        },
        zoomTo: function (selection) {
            state.zoomTo(selection);
        },
        zoomOut: function () {
            state.zoomOut();
        },
        point: function (x, y) {
            return state.at(x,y);
        },
        move: function (x, y) {
            state.move(x, y);
        },
        histogram: function() {
            return state.histogram();
        },
        palette: function () {
            return state.palette();
        },
        state: function () {
            return state;
        },
        stop: function () {
            screen.stop();
            console.log('Stopped rendering main screen');

        },
        go: function() {
            screen.go();
        }
    };
};
var ui = {};
namespace("jim.init");
jim.init.run = function () {
    "use strict";
    var currentMandelbrotSet = jim.mandelbrotImage.create();
    var area = {x: -2.5, y: -1, w: 3.5, h: 2};
    var nodes = currentMandelbrotSet.palette().toNodeList();
    var currentLocation = "";
    var areaNotifier = {
            notify: function (_area) {
                area = _area;
                this.build();
            },
            notifyPalette: function (_nodes) {
                nodes = _nodes;
                this.build();
            },
            build: function () {
                var base = window.location.origin;
                var path = window.location.pathname;
                var hash = encodeURI(JSON.stringify({position: area, nodes: nodes}));
                currentLocation = base + path + "#" + hash;
            }
        },
        canvasDiv = document.getElementById("mandelbrotCanvas"),
        pixelInfo = document.getElementById("pixelInfoCanvas"),
        colourPickerCanvas = document.getElementById("colourPickerCanvas"),
        colourGradientCanvas = document.getElementById("colourGradientCanvas"),
        addButton = document.getElementById("addButton"),
        removeButton = document.getElementById("removeButton"),
        bookmarkButton = document.getElementById("bookmarkButton"),
        colourGradientui = jim.colour.gradientui.create(colourGradientCanvas, addButton, removeButton, currentMandelbrotSet.palette(), areaNotifier),
        colourPicker = jim.colour.colourPicker.create(colourPickerCanvas, colourGradientui),

        lui = jim.mandelbrot.ui.create(
            currentMandelbrotSet,
            canvasDiv,
            currentMandelbrotSet.canvas().width,
            currentMandelbrotSet.canvas().height,
            pixelInfo, areaNotifier),
        uiCanvas = document.createElement('canvas'),
        maxIteration = document.getElementById("maxIteration"),

        render = function () {
            currentMandelbrotSet.draw();
            maxIteration.innerText = currentMandelbrotSet.state().maximumIteration();
            lui.draw(uiCanvas);
            colourGradientui.draw();
        };

    var hash = decodeURI(window.location.hash);
    var initialLocation;

    if (hash.length >1) {
        var initialArgs = JSON.parse(decodeURI(window.location.hash.substring(1)));
        initialLocation = jim.rectangle.create(initialArgs.position.x, initialArgs.position.y, initialArgs.position.w, initialArgs.position.h);
        currentMandelbrotSet.palette().fromNodeList(initialArgs.nodes);
        colourGradientui.rebuildMarkers();
    } else {
        initialLocation = jim.rectangle.create(-2.5, -1, 3.5, 2);
    }

    currentMandelbrotSet.state().setExtents(initialLocation);
    areaNotifier.notify({x: initialLocation.topLeft().x, y: initialLocation.topLeft().y, w: initialLocation.width(), h: initialLocation.height()});

    bookmarkButton.onclick = function () {
        window.location = currentLocation;
    };

    jim.mandelbrot.ui.elements.create(currentMandelbrotSet);

    pixelInfo.width = 162;
    pixelInfo.height = 162;
    ui = lui;
    uiCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    uiCanvas.width = currentMandelbrotSet.canvas().width;
    uiCanvas.height = currentMandelbrotSet.canvas().height;
    uiCanvas.className = "canvas";
    canvasDiv.appendChild(currentMandelbrotSet.canvas());
    canvasDiv.appendChild(uiCanvas);
    colourPicker.draw();

    jim.anim.create(render).start();
};

//histogram visualisation not working - it is now
// pull it out write some tests?
// pixel inspector not working
// pull it out and write some tests?
// button highlighting not working some now do
// prefer dropdown menu with preset options for export
// split export again into a number of parts
    //may as well make use of existing splitting as I know it is right. I just need to apportioin it to different canvases

// butttons?
// stop / start?


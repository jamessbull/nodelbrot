namespace("jim.defaults");
jim.defaults.mandelbrotExtents = jim.rectangle.create(-2.5, -1, 3.5, 2);

namespace("jim.mandelbrotImage");
jim.mandelbrotImage.create = function (_events) {
    "use strict";
    var startingExtent = jim.rectangle.create(-2.5, -1, 3.5, 2),
        state = jim.mandelbrot.state.create(700, 400, startingExtent, _events),
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
    var currentMandelbrotSet = jim.mandelbrotImage.create(events);
    var area = {x: -2.5, y: -1, w: 3.5, h: 2};
    var nodes = currentMandelbrotSet.palette().toNodeList();
    //var currentLocation = "";
    var areaNotifier = {
            currentLocation: "",
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
                this.currentLocation = base + path + "#" + hash;
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
        percEscaped = document.getElementById("totalHistogramPerc"),
        round = jim.common.round,
        lastEscapedOn = document.getElementById("lastPointEscapedAt"),
        smallExport = document.getElementById("smallExport"),
        mediumExport = document.getElementById("mediumExport"),
        largeExport = document.getElementById("largeExport"),
        veryLargeExport = document.getElementById("veryLargeExport"),
        exportSizeSelect = document.getElementById("exportSizeSelect");


    var exportDimensions = {height: 400, width: 700};
    var deadRegionsCanvas = document.createElement('canvas');
    jim.mandelbrot.ui.elements.create(exportDimensions, currentMandelbrotSet, deadRegionsCanvas, events);

    var render = function () {
            currentMandelbrotSet.draw();
            var iter = currentMandelbrotSet.state().maximumIteration();
            maxIteration.innerText = iter;
            var total = 700 * 400;
            var escapedThisIteration = currentMandelbrotSet.histogram().get(iter);
            var escaped = total - escapedThisIteration;

            if (escapedThisIteration > 0) {
                percEscaped.innerText = round((100 - ((escaped / total) * 100)), 2);
                lastEscapedOn.innerText = iter;
            }
            lui.draw(uiCanvas);
            colourGradientui.draw();
        };

    exportSizeSelect.onchange = function () {
        if (smallExport.selected) {
            console.log("large");
            exportDimensions.width = 700;// 700 * 4 = 2800
            exportDimensions.height = 400;
        }
        if (mediumExport.selected) {
            console.log("medium");
            exportDimensions.width = 2100;
            exportDimensions.height = 1200;
        }
        if (largeExport.selected) {
            console.log("large");
            exportDimensions.width = 4200;
            exportDimensions.height = 2400;
        }
        if (veryLargeExport.selected) {
            console.log("very large");
            exportDimensions.width = 6139;
            exportDimensions.height = 3508;
        }
    };


    var bookmarker = jim.mandelbrot.bookmark.create(bookmarkButton, areaNotifier, currentMandelbrotSet, colourGradientui);
    bookmarker.changeLocation();

    pixelInfo.width = 162;
    pixelInfo.height = 162;
    ui = lui;
    uiCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    deadRegionsCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    deadRegionsCanvas.width = currentMandelbrotSet.canvas().width;
    deadRegionsCanvas.height = currentMandelbrotSet.canvas().height;
    deadRegionsCanvas.className = "canvas";

    uiCanvas.width = currentMandelbrotSet.canvas().width;
    uiCanvas.height = currentMandelbrotSet.canvas().height;
    uiCanvas.className = "canvas";
    canvasDiv.appendChild(currentMandelbrotSet.canvas());
    canvasDiv.appendChild(uiCanvas);
    canvasDiv.appendChild(deadRegionsCanvas);
    colourPicker.draw();

    jim.anim.create(render).start();
};

// What do I want to do to go live?

// Ideally - Functionality

// Pull all functionality out of mandelbrot.js

// Replace use of notifiers with events.
// very slow to move. Can I calculate a really quick full histogram on zooms?
// using same technique as for full export? No need for histogram update at all then may make stuff generally faster.
// can use an effect where I zoom in / out to mask it?


// Then investigate why it crashes chrome at 250k iterations. Memory issue with a webWorker?
// Looks like webworkers themselves should be ok.
//Think it is main thread crashing when data posted back. Shoud be the same though
// add info icons with hover and helpful text
// Need to give sizes for exports and pick sensible defaults
// go through and remove any unused code / methods

//Nice to have
// // Time estimate for export
//zoom animates
// scrolling messages
// play with canvas distortion effects and css transforms
// maybe the display can be tiled and each tile flips on zoom
// Try webworkers to drive main display
// Try multiple canvases

//Go live tasks
// minify js
// make sure it works on firefox safari and at least one version of ie
// make it work on ipad too?
// make it estimate best level of parallelism? Optional


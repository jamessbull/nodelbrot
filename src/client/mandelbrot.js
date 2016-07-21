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
    var newMainUI = jim.mandelbrot.ui.create;
    var dom = jim.dom.functions.create();
    var mandelbrot = jim.mandelbrotImage.create(events);
    var mandelCanvas = mandelbrot.canvas();
    var canvasDiv = dom.element("mandelbrotCanvas");
    var pixelInfo = dom.element("pixelInfoCanvas");
    var colourPickerCanvas = dom.element("colourPickerCanvas");
    var colourGradientCanvas = dom.element("colourGradientCanvas");
    var addButton = dom.element("addButton");
    var removeButton = dom.element("removeButton");
    var bookmarkButton = dom.element("bookmarkButton");
    var colourGradientui = jim.colour.gradientui.create(colourGradientCanvas, addButton, removeButton, mandelbrot.palette(), events);
    var colourPicker = jim.colour.colourPicker.create(colourPickerCanvas, colourGradientui);
    var mainDisplayUI = newMainUI(mandelbrot, canvasDiv, mandelCanvas.width, mandelCanvas.height, pixelInfo);
    var uiCanvas = document.createElement('canvas');
    var maxIteration = dom.element("maxIteration");
    var percEscaped = dom.element("totalHistogramPerc");
    var round = jim.common.round;
    var lastEscapedOn = dom.element("lastPointEscapedAt");
    var smallExport = dom.element("smallExport");
    var mediumExport = dom.element("mediumExport");
    var largeExport = dom.element("largeExport");
    var veryLargeExport = dom.element("veryLargeExport");
    var exportSizeSelect = dom.element("exportSizeSelect");


    var deadRegionsCanvas = document.createElement('canvas');

    var exportSizeDropdown = jim.mandelbrot.exportDropdown.create(exportSizeSelect, [smallExport, mediumExport, largeExport, veryLargeExport]);
    jim.mandelbrot.ui.elements.create(exportSizeDropdown, mandelbrot, deadRegionsCanvas, events);
    var bookmarker = jim.mandelbrot.bookmark.create(bookmarkButton, mandelbrot, colourGradientui);
    bookmarker.changeLocation();
    var render = function () {
            mandelbrot.draw();
            var iter = mandelbrot.state().maximumIteration();
            maxIteration.innerText = iter;
            var total = 700 * 400;
            var escapedThisIteration = mandelbrot.histogram().get(iter);
            var escaped = total - escapedThisIteration;

            if (escapedThisIteration > 0) {
                percEscaped.innerText = round((100 - ((escaped / total) * 100)), 2);
                lastEscapedOn.innerText = iter;
            }
            mainDisplayUI.draw(uiCanvas);
            colourGradientui.draw();
        };



    pixelInfo.width = 162;
    pixelInfo.height = 162;
    ui = mainDisplayUI;
    uiCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    deadRegionsCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    deadRegionsCanvas.width = mandelCanvas.width;
    deadRegionsCanvas.height = mandelCanvas.height;
    deadRegionsCanvas.className = "canvas";

    uiCanvas.width = mandelCanvas.width;
    uiCanvas.height = mandelCanvas.height;
    uiCanvas.className = "canvas";
    canvasDiv.appendChild(mandelbrot.canvas());
    canvasDiv.appendChild(uiCanvas);
    canvasDiv.appendChild(deadRegionsCanvas);
    colourPicker.draw();

    jim.anim.create(render).start();
};

// What do I want to do to go live?

// Ideally - Functionality

// Pull all functionality out of mandelbrot.js


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


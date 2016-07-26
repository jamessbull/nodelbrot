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
namespace("jim.init");
jim.init.run = function () {
    "use strict";
    var round                   = jim.common.round;
    var newMainUI               = jim.mandelbrot.ui.create;
    var dom                     = jim.dom.functions.create();
    var mandelbrot              = jim.mandelbrotImage.create(events);
    var newColourGradientUI     = jim.colour.gradientui.create;
    var newColourPicker         = jim.colour.colourPicker.create;
    var newExportSizeDropdown   = jim.mandelbrot.exportDropdown.create;
    var newMiscUiElements       =  jim.mandelbrot.ui.elements.create;
    var newBookmarker           = jim.mandelbrot.bookmark.create;
    var mandelCanvas            = mandelbrot.canvas();

    var uiCanvas                = document.createElement('canvas');
    var deadRegionsCanvas       = document.createElement('canvas');

    var canvasDiv               = dom.element("mandelbrotCanvas");
    var pixelInfoCanvas         = dom.element("pixelInfoCanvas");
    var colourPickerCanvas      = dom.element("colourPickerCanvas");
    var colourGradientCanvas    = dom.element("colourGradientCanvas");
    var addButton               = dom.element("addButton");
    var removeButton            = dom.element("removeButton");
    var bookmarkButton          = dom.element("bookmarkButton");
    var maxIteration            = dom.element("maxIteration");
    var percEscaped             = dom.element("totalHistogramPerc");
    var lastEscapedOn           = dom.element("lastPointEscapedAt");
    var smallExport             = dom.element("smallExport");
    var mediumExport            = dom.element("mediumExport");
    var largeExport             = dom.element("largeExport");
    var veryLargeExport         = dom.element("veryLargeExport");
    var exportSizeSelect        = dom.element("exportSizeSelect");

    var mainDisplayUI = newMainUI(mandelbrot, canvasDiv, mandelCanvas.width, mandelCanvas.height, pixelInfoCanvas);
    var colourGradientui = newColourGradientUI(colourGradientCanvas, addButton, removeButton, mandelbrot.palette(), events);
    var colourPicker = newColourPicker(colourPickerCanvas, colourGradientui);
    var exportSizeDropdown = newExportSizeDropdown(exportSizeSelect, [smallExport, mediumExport, largeExport, veryLargeExport]);
    newMiscUiElements(exportSizeDropdown, mandelbrot, deadRegionsCanvas, events);
    var bookmarker = newBookmarker(bookmarkButton, mandelbrot, colourGradientui);
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

    pixelInfoCanvas.width = 162;
    pixelInfoCanvas.height = 162;
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

// very slow to move. Can I calculate a really quick full histogram on zooms?
// using same technique as for full export? No need for histogram update at all then may make stuff generally faster.
// can use an effect where I zoom in / out to mask it?


// Then investigate why it crashes chrome at 250k iterations. Memory issue with a webWorker?
// Does it crash at 250k on small images

// likely related to the histogram. A large number of iterations means a large sparsely populated array
// can I stop generating the histogram when the rate of escape slows sufficiently?


// Memory usage is governed by a number of factors
//  1 The number of iterations. By virtue of the histogram required to store the colour data
//  2 The size of the export
//  3 The efficiency of the algorithm used to stitch the results together
// I can limit the memory usage for export by limiting export options - Done
//  Job two make sure the stitching does not make unnecessary copies of the results data done
// The results from the worker are uint8 clamped arrays.
// As the results come in just copy them straight to the array which will be set on the image

// Can I limit the histogram size?
// I could calculate the histogram until the slope of the line reaches a threshold value
// if there is no value then I could extrapolate forwards using the last data point and the threshold slope
// I could also look at the rate of change of slope?

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


namespace("jim.defaults");
jim.defaults.mandelbrotExtents = jim.rectangle.create(-2.5, -1, 3.5, 2);

namespace("jim.mandelbrotImage");
jim.mandelbrotImage.create = function (_events, _width, _height) {
    "use strict";

    var startingExtent = jim.rectangle.create(-2.5, -1, 3.5, 2);
    var state = jim.mandelbrot.state.create(_width, _height, startingExtent, _events);

    var canvas = document.createElement('canvas');
    canvas.width = _width;
    canvas.height = _height;
    canvas.className = "canvas";
    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };

    var mandelbrotCalculator = jim.mandelbrot.webworkerInteractive.create(canvas, _width, _height, state, _events);
    mandelbrotCalculator.start();
    return {
        canvas: function () {
            return canvas;
        },
        move: function (x, y) {
            state.move(x, y);
        },
        palette: function () {
            return state.palette();
        },
        state: function () {
            return state;
        },
        stop: function () {
            mandelbrotCalculator.stop();
        },
        go: function() {
            mandelbrotCalculator.start();
        }
    };
};
namespace("jim.init");
jim.init.run = function () {
    "use strict";
    var round                   = jim.common.round;
    var newMainUI               = jim.mandelbrot.ui.create;
    var dom                     = jim.dom.functions.create();
    var mandelbrot              = jim.mandelbrotImage.create(events, 700, 400);
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

    var colourGradientui = newColourGradientUI(colourGradientCanvas, addButton, removeButton, mandelbrot.palette(), events);
    var bookmarker = newBookmarker(bookmarkButton, mandelbrot, colourGradientui);
    var mainDisplayUI = newMainUI(mandelbrot, canvasDiv, mandelCanvas.width, mandelCanvas.height, pixelInfoCanvas);
    window.ui = mainDisplayUI;
    var colourPicker = newColourPicker(colourPickerCanvas, colourGradientui);
    var exportSizeDropdown = newExportSizeDropdown(exportSizeSelect, [smallExport, mediumExport, largeExport, veryLargeExport]);
    newMiscUiElements(exportSizeDropdown, mandelbrot, deadRegionsCanvas, events);

    var render = function () {
            var iter = mandelbrot.state().maximumIteration();
            maxIteration.innerText = iter;
            var total = 700 * 400;
            var escapedThisIteration = mandelbrot.state().escapedByCurrentIteration;
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

    uiCanvas.width = mandelCanvas.width;
    uiCanvas.height = mandelCanvas.height;
    uiCanvas.className = "canvas";
    uiCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    canvasDiv.appendChild(mandelbrot.canvas());
    canvasDiv.appendChild(uiCanvas);
    canvasDiv.appendChild(deadRegionsCanvas);
    colourPicker.draw();

    jim.anim.create(render).start();
    bookmarker.changeLocation();

};

// to fix - moving is a bit wonky
// examine is broken
// dead region display should not persist on move or zoom

//Fix up broken bits
// split main display into separate threads.
// I think breaking it up into three regions would be best
// so refactor a bit to tidy everything up
// Make sure it is easy to split this into chunks.
// Each chunk should be exactly the same as existing code but with different extents and a different canvas
// so refactor until I can run the code mandelbrotRender(extents, canvas)

//What is the difference between the whole display which I want to zoom in and out of and the chunks that make it up?
// zooming in only applies to the whole thing. It represents the whole state - all the chunks.
// Or not  - it represents the current area of interest.
// So just the overall extents and previous extents
// And the colouring info as that is shared by all chunks
// The main state represents what is shared by all chunks
// Thge chunks should only have the things that are not shared
// The chunks are not interested in the whole extents but they are interested in the histo data
// maybe it's a whole part thing
//
//
//
//


// To optimise
// Alter step value automatically to balance frame rate with progress
// Have multiple interactive webworkers
// Do SIMD - But not until chrome supports it.

// Show export progress better dim lines as they finish
// auto start stop when exporting / not exporting
// make main display multicore and use webworker for extra speed
// progress messages during export
// Help icons with hover
// animated zoom
// make size switchable
// minify js
// remove all dead code
// estimate long tail cap histo size at 300k use last 100k to  estimate next 500k
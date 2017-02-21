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

    var mandelbrotCalculator = jim.mandelbrot.webworkerInteractive.create(_width, _height, _events);
    //mandelbrotCalculator.start();
    return {
        canvas: function () {
            return canvas;
        },
        move: function (x, y) {
            state.move(x, y);
        },
        state: function () {
            return state;
        },
        stop: function () {
            mandelbrotCalculator.stop();
        },
        go: function() {
            mandelbrotCalculator.start();
        },
        width: function () {
            return _width;
        },
        height: function () {
            return _height;
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
    var deadRegionCanvas        = document.createElement('canvas');
    deadRegionCanvas.width = mandelbrot.width();
    deadRegionCanvas.height = mandelbrot.height();
    deadRegionCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    var processor = jim.mandelbrot.escapeDistributionHistogram.create(events);
    var deadRegions = jim.mandelbrot.deadRegions.create(events, deadRegionCanvas, mandelbrot.canvas());
    jim.mandelbrot.imageRenderer.create(events, mandelbrot.canvas(), mandelbrot.width(), mandelbrot.height());
    var palette = jim.palette.create();
    var colourGradientui = newColourGradientUI(colourGradientCanvas, addButton, removeButton, palette, events);

//    events.fire(events.extentsUpdate, mandelbrot.state().getExtents());

    var bookmarker = newBookmarker(bookmarkButton, mandelbrot, colourGradientui, events);
    var mainDisplayUI = newMainUI(mandelbrot, canvasDiv, mandelCanvas.width, mandelCanvas.height, pixelInfoCanvas);
    window.ui = mainDisplayUI;
    var colourPicker = newColourPicker(colourPickerCanvas, colourGradientui);
    var exportSizeDropdown = newExportSizeDropdown(exportSizeSelect, [smallExport, mediumExport, largeExport, veryLargeExport]);
    newMiscUiElements(exportSizeDropdown, mandelbrot, deadRegionsCanvas, events, palette);
    var iter = 0;
    var render = function () {
        events.listenTo(events.maxIterationsUpdated, function (_iter) {
            iter = _iter;
        });
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

    events.fire(events.paletteChanged, palette);
    bookmarker.changeLocation();
    events.fire(events.paletteChanged, palette);

};

// examine is broken
// observed difference between interactive and full export colouration
// Likely a histogram issue
// Export broken if dead regions have not been calculated

// split main display into separate threads.
// I think breaking it up into three regions would be best
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

// fire event 1
// fire event 2 extents are updated
// event
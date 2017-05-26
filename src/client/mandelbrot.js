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
    var histoData = new Uint32Array(250000);
    var imgData = new Uint8ClampedArray(_width * _height * 4 );
    var escapeValues = new Uint32Array(_width * _height);
    var imageEscapeValues = new Uint32Array(_width * _height);
    var xState = new Uint32Array(_width * _height);
    var yState = new Uint32Array(_width * _height);

    var mandelbrotCalculator = jim.mandelbrot.webworkerInteractive.create(_width, _height, _events, 70, 4, imgData, escapeValues, xState, yState, imageEscapeValues);
    return {
        histoData: function () {
          return histoData;
        },
        canvas: function () {
            return canvas;
        },
        imgData: function () {
            return imgData;
        },
        escapeValues: function () {
            return escapeValues;
        },
        imageEscapeValues: function () {
          return imageEscapeValues;
        },
        xState: function () {
            return xState;
        },
        yState: function () {
            return yState;
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
    var fps                     = dom.element("framesPerSecond");
    var deadRegionCanvas        = document.createElement('canvas');
    deadRegionCanvas.width = mandelbrot.width();
    deadRegionCanvas.height = mandelbrot.height();
    deadRegionCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    uiCanvas.width = mandelCanvas.width;
    uiCanvas.height = mandelCanvas.height;

    jim.mandelbrot.mandelbrotViewUIPolicy.create(uiCanvas, events);
    var zoomInAnim = jim.mandelbrot.ui.actions.zoomInAnimation.create(uiCanvas, mandelbrot.canvas());
    jim.mandelbrot.actions.zoomOut.create(events, jim.stopwatch.create());
    jim.mandelbrot.actions.zoomIn.create(mandelbrot.canvas(), uiCanvas, events, jim.selection.create(jim.rectangle.create(0, 0, mandelbrot.canvas().width, mandelbrot.canvas().height)), zoomInAnim);
    jim.mandelbrot.actions.move.create(events, mandelbrot.canvas(), uiCanvas);

    jim.metrics.create(jim.metrics.clock.create(), events);
    jim.fpsdisplay.create(fps, events, dom);
    jim.mandelbrot.escapeDistributionHistogram.create(events, mandelbrot.histoData());
    jim.mandelbrot.deadRegions.create(events, deadRegionCanvas, mandelbrot.canvas(), mandelbrot.escapeValues());
    jim.mandelbrot.imageRenderer.create(events, mandelbrot.canvas(), mandelbrot.width(), mandelbrot.height());
    jim.mandelbrot.examinePixelStateDisplay.create(events, pixelInfoCanvas, mandelbrot.imgData(), mandelbrot.xState(), mandelbrot.yState(), mandelbrot.escapeValues(), mandelbrot.imageEscapeValues(), mandelbrot.width());

    var palette = jim.palette.create();
    var colourGradientui = newColourGradientUI(colourGradientCanvas, addButton, removeButton, palette, events);

    var bookmarker = newBookmarker(bookmarkButton, mandelbrot, colourGradientui, events);
    var colourPicker  = newColourPicker(colourPickerCanvas, colourGradientui);
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
        colourGradientui.draw();
    };

    pixelInfoCanvas.width = 162;
    pixelInfoCanvas.height = 162;


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

// Next improvements


// look at palette
// Display number of pixels escaping per second
// Show iteration number of pixels escaping per second went below threshold.
// Make histogram use combined worker on export
// Can export use combined worker? Or at least refactor so messages are all the same and pull out pixel trackers into separate files.
// Profile again and try to improve speed.
//reset dead regions on zoom and move. Lost that again.

//zoom in smoothly
//selection snaps out in blocks
//copy current render view to new canvas - old view
//paint old view on to ui display
//when selection snaps zoom set view
//have a selection made anim that takes a bit of time
// begin zoom
// need anim
// first draws the old view scaled up by x% What is starting position?
// starting position is the new view scaled down until it is the same number of pixels across as the selection
// so method arameter for the selection
// then draws current render scaled down by 100 - same amount
// does this until render view reaches 100 %
// clears ui canvas
// anim ends

//


//refactoring get rid of mandelbrot image
// Experiments - Ho many fps do I get if I skip the loop to actually calc pixels? For later
// To optimise
// Alter step value automatically to balance frame rate with progress

// Do SIMD - But not until chrome supports it.

// Show export progress better dim lines as they finish
//
// auto start stop when exporting / not exporting
// progress messages during export
// Help icons with hover
// make size switchable
// minify js
// remove all dead code
// estimate long tail cap histo size at 300k use last 100k to  estimate next 500k

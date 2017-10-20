namespace("jim.defaults");
jim.defaults.mandelbrotExtents = jim.rectangle.create(-2.5, -1, 3.5, 2);

namespace("jim.mandelbrotImage");
jim.mandelbrotImage.create = function (_events, _width, _height) {
    "use strict";
    var dom                     = jim.dom.functions.create();

    var startingExtent = jim.rectangle.create(-2.5, -1, 3.5, 2);

    var state = jim.mandelbrot.state.create(_width, _height, startingExtent, _events);

    var canvas = dom.element("mandelbrotCanvas");
    canvas.width = _width;
    canvas.height = _height;
    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    var histoData = new Uint32Array(250000);
    var imgData = new Uint8ClampedArray(_width * _height * 4 );
    var escapeValues = new Uint32Array(_width * _height);
    var imageEscapeValues = new Uint32Array(_width * _height);
    var xState = new Uint32Array(_width * _height);
    var yState = new Uint32Array(_width * _height);

    var mandelbrotCalculator = jim.mandelbrot.webworkerInteractive.create(_width, _height, _events, 30, 3, imgData, escapeValues, xState, yState, imageEscapeValues);
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

    var uiCanvas                = dom.element('uiCanvas');
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
    var deadRegionCanvas        = dom.element("deadRegionCanvas");
    deadRegionCanvas.width = mandelbrot.width();
    deadRegionCanvas.height = mandelbrot.height();
    deadRegionCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    uiCanvas.width = mandelCanvas.width;
    uiCanvas.height = mandelCanvas.height;

    jim.mandelbrot.mandelbrotViewUIPolicy.create(uiCanvas, events);
    var drawSelection = jim.mandelbrot.ui.actions.drawSelection.create();
    var zoomInAnim = jim.mandelbrot.ui.actions.zoomInAnimation.create(uiCanvas, mandelbrot.canvas(), drawSelection);
    var zoomOutAnim = jim.mandelbrot.ui.actions.zoomOutAnimation.create(uiCanvas, mandelbrot.canvas(), drawSelection);
    jim.mandelbrot.actions.zoomOut.create(events, jim.stopwatch.create(), zoomOutAnim, mandelbrot.canvas(),mandelbrot.state());
    jim.mandelbrot.actions.zoomIn.create(mandelbrot.canvas(), uiCanvas, events, jim.selection.create(jim.rectangle.create(0, 0, mandelbrot.canvas().width, mandelbrot.canvas().height)), zoomInAnim);
    jim.mandelbrot.actions.move.create(events, mandelbrot.canvas(), uiCanvas);

    jim.metrics.create(jim.metrics.clock.create(), events);
    jim.fpsdisplay.create(fps, events, dom);
    jim.mandelbrot.escapeDistributionHistogram.create(events, mandelbrot.histoData());
    jim.mandelbrot.deadRegions.create(events, deadRegionCanvas, mandelbrot.canvas(), mandelbrot.escapeValues());
    jim.mandelbrot.imageRenderer.create(events, mandelbrot.canvas(), mandelbrot.width(), mandelbrot.height());
    jim.mandelbrot.examinePixelStateDisplay.create(events, pixelInfoCanvas, mandelbrot.imgData(), mandelbrot.xState(), mandelbrot.yState(), mandelbrot.escapeValues(), mandelbrot.imageEscapeValues(), mandelbrot.width());
    jim.mandelbrot.pixelEscapeRateTracker.create(events);
    var palette = jim.palette.create(events);
    var colourGradientui = newColourGradientUI(colourGradientCanvas, addButton, removeButton, palette, events);

    var bookmarker = newBookmarker(bookmarkButton, mandelbrot, colourGradientui, events);
    newColourPicker(colourPickerCanvas, colourGradientui, events);
    var exportSizeDropdown = newExportSizeDropdown(exportSizeSelect, [smallExport, mediumExport, largeExport, veryLargeExport]);
    newMiscUiElements(exportSizeDropdown, mandelbrot, events);
    events.listenTo(events.maxIterationsUpdated, function (_iter) {
        maxIteration.innerText = _iter;
        var total = 700 * 400;
        var escapedThisIteration = mandelbrot.state().escapedByCurrentIteration;
        var escaped = total - escapedThisIteration;

        if (escapedThisIteration > 0) {
            percEscaped.innerText = round((100 - ((escaped / total) * 100)), 2);
            lastEscapedOn.innerText = _iter;
        }
    });

    pixelInfoCanvas.width = 144;
    pixelInfoCanvas.height = 144;

    uiCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };

    events.fire(events.paletteChanged, palette);
    bookmarker.changeLocation();
    events.fire(events.paletteChanged, palette);
    events.fire(events.colourSelected, {x:4,y:4, hue: 12});

};

// Missing features
// Once export progress is dismissed put download button on main panel
// Make examine button behave
// Don't send unnecessary arrays back and forth
// investigate reduction in performance


// Make zoom border proper
// Stop zoom out border appearing when fully zoomed out
// Make parallelism and chunk size auto configure for max perf and smooth frame rate depending on conditions
// Make buttons a different colour and round the edges and try a thinner border
// make details pixel border the correct colours


//Make render size / resolution slightly configurable
// can I pop up export progress when I start export and hide it afterwards?

// look at palette - can it be optimsed can I have hsl values back?
// Maybe - maintain two sets of colours - one hsl one rgb update both as palette changes
// problem with hsl values is interpolated values still need to be changed back to rgb for rendering
// have a think

// Adjust number of blocks I split the screen into according to performance;
// Then adjust block size to maintain 24 fps
//
// minify js
// estimate long tail cap histo size at 300k use last 100k to  estimate next 500k

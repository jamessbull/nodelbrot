namespace("jim.defaults");
jim.defaults.mandelbrotExtents = jim.rectangle.create(-2.5, -1, 3.5, 2);

namespace("jim.init");
jim.init.run = function () {
    "use strict";
    var displayWidth            = 700;
    var displayHeight           = 400;
    var histoData = new Uint32Array(250000);
    var round                   = jim.common.round;
    var dom                     = jim.dom.functions.create();
    var mainCanvas              = dom.element("mandelbrotCanvas");

    var startingExtent = jim.rectangle.create(-2.5, -1, 3.5, 2);

    var state = jim.mandelbrot.state.create(displayWidth, displayHeight, startingExtent, events);


    var imgData = new Uint8ClampedArray(displayWidth * displayHeight * 4 );
    var escapeValues = new Uint32Array(displayWidth * displayHeight);
    var imageEscapeValues = new Uint32Array(displayWidth * displayHeight);
    var xState = new Uint32Array(displayWidth * displayHeight);
    var yState = new Uint32Array(displayWidth * displayHeight);

    var mandelbrotCalculator = jim.mandelbrot.webworkerInteractive.create(displayWidth, displayHeight, events, 30, 3, imgData, escapeValues, xState, yState, imageEscapeValues, startingExtent);
    mandelbrotCalculator.start();


    mainCanvas.width = displayWidth;
    mainCanvas.height = displayHeight;
    mainCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };

    var newColourGradientUI     = jim.colour.gradientui.create;
    var newColourPicker         = jim.colour.colourPicker.create;
    var newExportSizeDropdown   = jim.mandelbrot.exportDropdown.create;
    var newMiscUiElements       =  jim.mandelbrot.ui.elements.create;
    var newBookmarker           = jim.mandelbrot.bookmark.create;
    var mandelCanvas            = mainCanvas;

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
    deadRegionCanvas.width = displayWidth;
    deadRegionCanvas.height = displayHeight;
    deadRegionCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    uiCanvas.width = mandelCanvas.width;
    uiCanvas.height = mandelCanvas.height;

    jim.mandelbrot.mandelbrotViewUIPolicy.create(uiCanvas, events);
    var drawSelection = jim.mandelbrot.ui.actions.drawSelection.create();
    var zoomInAnim = jim.mandelbrot.ui.actions.zoomInAnimation.create(uiCanvas, mainCanvas, drawSelection);
    var zoomOutAnim = jim.mandelbrot.ui.actions.zoomOutAnimation.create(uiCanvas, mainCanvas, drawSelection);
    jim.mandelbrot.actions.zoomOut.create(events, jim.stopwatch.create(), zoomOutAnim, mainCanvas, state);
    jim.mandelbrot.actions.zoomIn.create(mainCanvas, uiCanvas, events, jim.selection.create(jim.rectangle.create(0, 0, mainCanvas.width, mainCanvas.height)), zoomInAnim);
    jim.mandelbrot.actions.move.create(events, mainCanvas, uiCanvas);

    jim.metrics.create(jim.metrics.clock.create(), events);
    jim.fpsdisplay.create(fps, events, dom);
    jim.mandelbrot.escapeDistributionHistogram.create(events, histoData);
    jim.mandelbrot.deadRegions.create(events, deadRegionCanvas, mainCanvas, escapeValues);
    jim.mandelbrot.imageRenderer.create(events, mainCanvas, displayWidth, displayHeight);
    jim.mandelbrot.examinePixelStateDisplay.create(events, pixelInfoCanvas, imgData, xState, yState, escapeValues, imageEscapeValues, displayWidth, uiCanvas);
    jim.mandelbrot.pixelEscapeRateTracker.create(events);
    var palette = jim.palette.create(events);
    var colourGradientui = newColourGradientUI(colourGradientCanvas, addButton, removeButton, palette, events);

    var bookmarker = newBookmarker(bookmarkButton, state, colourGradientui, events);
    newColourPicker(colourPickerCanvas, colourGradientui, events);
    var exportSizeDropdown = newExportSizeDropdown(exportSizeSelect, [smallExport, mediumExport, largeExport, veryLargeExport]);
    newMiscUiElements(exportSizeDropdown, state, events);

    events.listenTo(events.maxIterationsUpdated, function (_iter) {
        maxIteration.innerText = _iter;
        var total = 700 * 400;
        var escapedThisIteration = state.escapedByCurrentIteration;
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
};

// Missing features

// Make buttons a different colour and round the edges and try a thinner border


// look at palette - can it be optimsed can I have hsl values back?
// Maybe - maintain two sets of colours - one hsl one rgb update both as palette changes
// problem with hsl values is interpolated values still need to be changed back to rgb for rendering
// have a think

// tidying up. Is there any code that can go? The mandelbrot image in here seems a bit odd.
// are the tests passing?

// minify js
// ok have written some code to plonk them all together for the main init.
// need to do the same for all three web workers.
// once that is done then I need to check it all works
//1) work out where the files will be served from to test it
// use hiawatha - installed in /usr/local/sbin conf in /usr/local/etc serving from nodelbrot latest.
//2) add all code to html and call init.run
//3) clump together code for all three webworkers - refactor so there is only one and a command i sent with each message identifying it?
//4) Yes that way only two files are required not four

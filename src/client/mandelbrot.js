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

    var lastTotal = 0;
    events.listenTo(events.histogramUpdated, function (histoInfo) {
        var iter = histoInfo.currentIteration;
        var total = histoInfo.total;
        maxIteration.innerText = iter;
        var difference = total - lastTotal;
        lastTotal = total;

        if (difference > 0) {
            lastEscapedOn.innerText = iter;
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

    function toggleVisibility(toggle, window, windowCtrl) {
        var result = false;
        if(toggle) {
            result = false;
            dom.addClass(window, "hidden");
            if (windowCtrl) {
                dom.deselectButton(windowCtrl);
            }
        } else {
            result = true;
            dom.removeClass(window, "hidden");
            if(windowCtrl) {
                dom.selectButton(windowCtrl);
            }
        }
        return result;
    }

    function closeWindow(window, windowCtrls) {
        dom.addClass(window, "hidden");
        windowCtrls.forEach(function (windowctrl) {
            dom.deselectButton(dom.element(windowctrl));
        });
        return false;
    }

    function setUpWindow(windowId, showWindowButtonIds, closeButtonId) {
        var windowshowing = false;
        var windy = dom.element(windowId);
        var openButtons = [];

        showWindowButtonIds.forEach(function (showWindowButtonId) {
            openButtons.push(dom.element(showWindowButtonId));
        });

        var closeButton = dom.element(closeButtonId);

        openButtons.forEach(function (openButton) {
            openButton.onclick = function () {
                windowshowing = toggleVisibility(windowshowing, windy, openButton);
            };
        });

        closeButton.onclick = function (e) {
            windowshowing = closeWindow(windy, showWindowButtonIds);
        };

        closeButton.onmousedown = function () {
            dom.selectButton(closeButton);
        };

        closeButton.onmouseup = function () {
            dom.deselectButton(closeButton);
        };

        return {
            showWindow: function () {
                windowshowing = toggleVisibility(windowshowing, windy, undefined);
            }
        };

    }

    setUpWindow("helptext", ["helptextbutton"], "closehelp");
    var chooseAmountWindow = setUpWindow("choosePaymentAmountWindow",["choosePaymentAmountButton1", "choosePaymentAmountButton2", "choosePaymentAmountButton3", "choosePaymentAmountButton4"], "closePaymentAmountWindow");
    var thankswindy = setUpWindow("thankyoubox", [], "closeThankyouBoxWindow");

    var paymentAmountInput = dom.element("amountInput");
    paymentAmountInput.onchange = function (e) {
        window.amount = e.target.value;
    };

    var allContent = dom.element("allContent");
    dom.removeClass(allContent, "transparent");
    dom.addClass(allContent, "fade");

    return {
        showThankyouWindow: function () {
            thankswindy.showWindow();
            chooseAmountWindow.showWindow();
        }
    };
};

// Things to do before trying to ge some viewers
// automate deployment. Should be ok.
// but issue with zipping with node and zlib setting wrong content encoding for that?


// Anything else? Adjust parallelism by running test and seeing if I can detect correct number of cores to use.
// Could do it by doing a message from the starting state start at one and increase parallelism until perf no longer goes up and then back off.
// genuinely useful

// better colours to start with don't like how the black looks as it zooms
namespace("jim.defaults");
jim.defaults.mandelbrotExtents = jim.rectangle.create(-2.5, -1, 3.5, 2);

namespace("jim.mandelbrotImage");
jim.mandelbrotImage.create = function (_events) {
    "use strict";
    var startingExtent = jim.rectangle.create(-2.5, -1, 3.5, 2),
        concHisto = jim.mandelbrot.webworkerHistogram.create(_events),
        state = jim.mandelbrot.state.create(700, 400, startingExtent, _events, concHisto),
        segments2 = jim.segment.createSegments(700, 400, 4, state),
        screen = jim.screen.create({segments: segments2}, undefined, _events);

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
// Fix move
// Done

// now needs to deal with scenario when histo out of data
// 1) Don't show black when no histo data
// That makes things better
// No need as histo calcs super fast
// Ideally would be nice to have a single message -> response and loop in main thread
// Done
// Make export work again
// Done
// Once done can I make full image export work in the same way?
// So currently setProcessor goes from state for a number of iterations and returns state
// Thoughts - state object which has image data too? But same calc for both histo and image deal with pixels differently
// Transferable - how will this work?
// Well I could pack an array and have value 1 be x val 2 be y val 3 be escaped at val 4 iterations
// x y it esc. A bit icky but doable. How much RAM for state? 8 bytes per num 4 nums per pixel - 32 bytes per pixel.
// 832Mb? Ouch
// Largest export has 21,000,000 pixels. Just not feasible to store whole state in addition to image data.
// So How can I deal with this? I want good coverage across the image so I do want to do it in chunks
// But if I do that then I need to store the state
// 700 * 400 = 280,000 I can store state for that
// so for image generation we need two modes of operation
// one where we have  state and one where we don't
//make sure image export continues to work as it does now.
// add another mode of operation where the state is transferred back and forward
// to save memory probably makes sense to have a number of arrays so x y big others not
// 1, 2,4,8,16,32,64,128,  256, 512, 1024, 2048, 8096, 16192, 32384, 64768,
// iterations should be 16 bit
// histogram can use typed arrays
// Create array and transfer it back - Done
// Biggest gain got by removing two ways of doing stuff
// If image generation is called with no state then don't return it
// if it is called with state then do return state

// Do SIMD
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
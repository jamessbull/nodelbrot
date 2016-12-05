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

    var mandelbrotCalculator = jim.mandelbrot.webworkerInteractive.create(canvas, _width, _height, state, _events);
    mandelbrotCalculator.start();
    return {
        canvas: function () {
            return canvas;
        },
        draw: function () {
            //screen.draw();
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


// Combined worker optimisation
// Have three messages update palette, update histogram, request image update
// The histogram has now got more complicated. I'm not rippling any more but this means I need to have two arrays for the histogram
// one for the colour calculation which is totalled and one for the updates as we go which is not totalled.

//So. I want combined worker to send back histogram updates and get sent totalled histogram
//Histogram starts empty.
// Send first calculation message to worker.
// It calculates pixels updates pixels escaped and sends back two things img data and histogram updates
// main thread co-ordinates histogram updates between workers.
// It has a single array which consists of un totalled data
// on every message the histogram updates are added to this array.
// histogram updates are sent as a separate message and are not done every frame
// on message received if current array is empty then we send a histo update
// to send a histo update we create a copy of the data, total it using histogram and
// then send copies of the totalled histo to the workers unless this is the last worker in which case send the thing itself

// For calculation updates deadRegions are not sent.
// If we are doing same extents extents don't need to change
// Have change extents message.
// don't send state back and forth
// Four messages
// 1) Update histogram
// 2) Set extents and output height and width
// 3) calculate current extents based on current state. Worker creates own initial state if state does not exist.
// 4) update palette - Palette is updated on change so whenever the user drags? Would need to to see it as I drag? It does it every fram right now so hey.
// Do I do it as a separate message or as part of normal message so I check to see if a palette has been sent?
// Make it optional part of message same for extents.
// So if extents are specified then we change extents and create new empty state; and then calculate
// If histo is specified we replace existing histo and then calculate
// If palette is specified we update existing palette and then calculate
// If nothing is specified we do nothing and then calculate
// When we calculate we send back array of things wot escaped and array of image colour data as it is currently
// What is best way to do this?
// Start by making combined worker keep it's own state and not transfer it back? Then I don't know when extents change happen
// Step one keep state locally and use that and update if it is set
// Worker keeps current state resets it when extents change
// Worker creates new array each time and transfers it back to main thread?
// Question. Is it quicker to transfer a single array back and forth or is it quicker to create a new array each time and send it in one direction?
// don't send x and y state

// Plan 1) Store extents in worker - done
//      2) Only send them when it changes - done but breaks bookmarking need to set the flag when extents are set - Done
//      3) Next verify not sending dead regions - dead regions not sent
//      4) Only send palette if a node position changes or a node is added or removed
//          i) Make combined worker store palette and only update it if it sent - done
//          ii) make palette fire events on change - done
//          iii) listen to those events and set flag to true on state for should trnsfer palette done
//          iv) finally only send palette if state says I should done


//Next don't send xstate / ystate ever
// change worker so that If undefined it gets initied
// then keep it in the worker and don't read from message
// then don't send and don't post back

//Still sent
// escape - image escape - histogram data
// escape values same as histo data but histo data is totalled every frame?
// I get sent entire histogram - could potentially send it less often we shall see
// get histogram data - good - also need to send back updates to main thread.
// get full histo data from main thread
// during calculation record the image escape values and histo escape values
// also create a new array to store histo updates and send those back
// Do send histo updates don't send back image escape histo escape or histogram

//in main thread receive update from workers and copy back data into histodata array
//periodically every x frames say send back updated and totalled histogram then don't total histo in worker
//Plan
// escape values and image escape values are never used in main worker so don't send back

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
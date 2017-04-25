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
    var imgData = new Uint8ClampedArray(_width * _height * 4 );
    var mandelbrotCalculator = jim.mandelbrot.webworkerInteractive.create(_width, _height, _events, 70, 4, imgData);
    return {
        canvas: function () {
            return canvas;
        },
        imgData: function () {
            return imgData;
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
    jim.metrics.create(jim.metrics.clock.create(), events);
    jim.fpsdisplay.create(fps, events, dom);
    jim.mandelbrot.escapeDistributionHistogram.create(events);
    jim.mandelbrot.deadRegions.create(events, deadRegionCanvas, mandelbrot.canvas());


    jim.mandelbrot.imageRenderer.create(events, mandelbrot.canvas(), mandelbrot.width(), mandelbrot.height());
    jim.mandelbrot.examinePixelStateDisplay.create(events, mandelbrot.imgData());

    var palette = jim.palette.create();
    var colourGradientui = newColourGradientUI(colourGradientCanvas, addButton, removeButton, palette, events);

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

// examine is broken - fix it
// ok so examine will work like this
//  As soon as you hit examine the main display stops updating.
// Send a message to all three workers to get copy of state.
// combine all xState yState into one main state. use this data to drive display.

// How does ui work? Click eyeball. Eye opens. I am now in select mode.
// cursor disappears when you move it over the image and a magnifying glass appears over main image.
// When the mouse is clicked magnifying glass disappears and is replaces with cursor in midle of expanded pixel display
// Mouse over on the pixel to see info. move mouse out of that magnified view to bring magnifying glass back again.
// Click open eye to restart main display and close eye again.

// How would I like to ask for state of worker?
// just create three ask for state jobs and throw them at the pool.
// They collect data on each job as it completes and finally fires an event with the whole set of data.
// The examiner listens to this event operates until it is dismissed and fires a start event when it is done.

// So to do
// Make a magnifying glass!
// Make cursor a magnifying glass when I click it highlight it
// stop the mandelbrot set.
// What data do I want? Img data / should have it
// I want to know the following


//var xState;
//var yState;
//var escapeValues;
//var imageEscapeValues;
// imgData


// So Have a ui control that is shown / hidden when I click magnifying glass
// The ui control listens to events.
// listens for showMagnified event which is fired with an int which tells me which pixel to show
// request data from worker
// listen for event that will provide the data
// The events are only generated while magnifying glass selected

// Init
// Create arrays
// Init all to 0
// create canvas nothing on it
//

// Request all data process
// send the can i have all data please event
// listen to the here is all the data event
// set all the arrays to values from message
// assume center pixel is selected

// In webworker mandelbrot set
// when asked for all data
// send message asking for data to each worker
// response should include offset
// when all are complete send i have all data message

// has it escaped
// How may iterations have run
// When did it escape
// what iteration did colour finish calculating on.
// What is the x value
// what is the y value

// send ask for data jobs.
// when all data collected send examine event
//
// create examiner to consume event
//

// Create appropriate job. Check to see
// So examine button is clicked. Send an examine event. Main loops responds and stops.
// Webworker listens to examine event and sends a special message to the worker to retrieve it's state.
// webworker sends message for region it wants to examine

// look at palette
// try using dead  regions on main display. Just calc occasionally. Send a job to a worker perhaps.
// Display number of pixels escaping per second
// Show iteration number of pixels escaping per second went below threshold.
// Make histogram use combined worker on export
// Can export use combined worker? Or at least refactor so messages are all the same and pull out pixel trackers into separate files.
// Profile again and try to improve speed.
//reset dead regions on zoom and move. Lost that again.

// New thought. Just pass array in and use set method.
// So create imgData array in mand.js and pass it in to the renderer.
// Then also pass it into pixel examiner so it can use it. Simple
// Next step is to collect data on each job for dead regions ie escape Values then publish all at once for dead regions
// Pass in escapeValues array into producer / webworkerbasedmand and consumer examinePixelDisplay
// 1) Change dead regions to expect single event with all data in array

// Experiments - Ho many fps do I get if I skip the loop to actually calc pixels? For later
// To optimise
// Alter step value automatically to balance frame rate with progress

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
// Why wouldn't the palette update? only changed how I create the jobs so it must be that?
// Double check.
// fire event 1
// fire event 2 extents are updated
// event
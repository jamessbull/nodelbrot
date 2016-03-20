namespace("jim.mandelbrotImage");
jim.mandelbrotImage.create = function () {
    "use strict";
    var startingExtent = jim.rectangle.create(-2.5, -1, 3.5, 2),
        state = jim.mandelbrot.state.create(700, 400, startingExtent),
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
            return state.palette().palette;
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
var ui = {};
namespace("jim.init");
jim.init.run = function () {
    "use strict";
    // Best way to update palette?
    // construct a new object from palette and current extents
    var currentMandelbrotSet = jim.mandelbrotImage.create();
    //-2.5, -1, 3.5, 2
    var area = {x: -2.5, y: -1, w: 3.5, h: 2};
    var nodes = currentMandelbrotSet.palette().toNodeList();
    var areaNotifier = {
            notify: function (_area) {
                area = _area;
                this.build();
            },
            notifyPalette: function (_nodes) {
                nodes = _nodes;
                this.build();
            },
            build: function () {
                var base = window.location.origin;
                var path = window.location.pathname;
                var hash = encodeURI(JSON.stringify({position: area, nodes: nodes}));
                document.getElementById("bookmark").href = base + path + "#" + hash;
            }
        },
        canvasDiv = document.getElementById("mandelbrotCanvas"),
        pixelInfo = document.getElementById("pixelInfoCanvas"),
        colourPickerCanvas = document.getElementById("colourPickerCanvas"),
        colourGradientCanvas = document.getElementById("colourGradientCanvas"),
        addButton = document.getElementById("addButton"),
        removeButton = document.getElementById("removeButton"),
        colourGradientui = jim.colour.gradientui.create(colourGradientCanvas, addButton, removeButton, currentMandelbrotSet.palette(), areaNotifier),
        colourPicker = jim.colour.colourPicker.create(colourPickerCanvas, colourGradientui),
        stopButton = document.getElementById("stop"),
        startButton = document.getElementById("start"),
        exportButton = document.getElementById("export"),
        progress = document.getElementById("numberProcessedSoFar"),
        lui = jim.mandelbrot.ui.create(
            currentMandelbrotSet,
            canvasDiv,
            currentMandelbrotSet.canvas().width,
            currentMandelbrotSet.canvas().height,
            pixelInfo, areaNotifier),
        uiCanvas = document.createElement('canvas'),
        maxIteration = document.getElementById("maxIteration"),

        render = function () {
            currentMandelbrotSet.draw();
            maxIteration.innerText = currentMandelbrotSet.state().maximumIteration();
            lui.draw(uiCanvas);
            colourGradientui.draw();
        };

    var reporter = {
        report: function (s) {
            progress.innerText = s;
        }
    };

    var hash = decodeURI(window.location.hash);
    var initialLocation;

    if (hash.length >1) {
        var initialArgs = JSON.parse(decodeURI(window.location.hash.substring(1)));
        initialLocation = jim.rectangle.create(initialArgs.position.x, initialArgs.position.y, initialArgs.position.w, initialArgs.position.h);
        currentMandelbrotSet.palette().fromNodeList(initialArgs.nodes);
        colourGradientui.rebuildMarkers();
    } else {
        initialLocation = jim.rectangle.create(-2.5, -1, 3.5, 2);
    }

    currentMandelbrotSet.state().setExtents(initialLocation);

    exportButton.onclick = function () {
        var histogramBuilder = new Worker("/js/histogramCalculatingWorker.js");
        var imageCalculator = new Worker("/js/mandelbrotImageCalculatingWorker.js");
        var stopwatch = jim.stopwatch.create();
        var exportWidth = 1400, exportHeight = 800;
        var maxIterations = 1000;
        var extents = currentMandelbrotSet.state().getExtents();

        var buildMessage = function (extents, height, width, iterations) {
            var msg = {};
            msg.mx = extents.topLeft().x;
            msg.my = extents.topLeft().y;
            msg.mw = extents.width();
            msg.mh = extents.height();
            msg.exportHeight = height;
            msg.exportWidth = width;
            msg.maxIterations = iterations;
            return msg;
        };

        imageCalculator.onmessage = function (e) {
            stopwatch.stop();
            reporter.report(e.data.progress + 'tim taken in seconds is ' + stopwatch.elapsed()/1000);
            if (e.data.imageDone) {
                var exportCanvas = document.createElement('canvas');
                exportCanvas.width = exportWidth;
                exportCanvas.height = exportHeight;
                var context = exportCanvas.getContext('2d');
                var outImage = context.createImageData(exportCanvas.width, exportCanvas.width);
                outImage.data.set(e.data.imgData);
                context.putImageData(outImage, 0, 0);
                document.getElementById("export1").href = exportCanvas.toDataURL("image/png");
            }
        };

        histogramBuilder.onmessage = function(e) {
            if (e.data.chunkComplete) {
                var message = buildMessage(extents,exportHeight, exportWidth, maxIterations);
                message.histogramData = e.data.histogramData;
                message.histogramSize = e.data.histogramSize;
                message.histogramTotal = e.data.histogramTotal;
                message.paletteNodes = currentMandelbrotSet.palette().toNodeList();
                imageCalculator.postMessage(message);
            }
        };
        var msg = buildMessage(extents, exportHeight, exportWidth, maxIterations);

        stopwatch.start();
        histogramBuilder.postMessage(msg);
    };

    stopButton.onclick = function () {
        currentMandelbrotSet.stop();
    };

    startButton.onclick = function () {
        currentMandelbrotSet.go();
    };

    pixelInfo.width = 162;
    pixelInfo.height = 162;
    ui = lui;
    uiCanvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    uiCanvas.width = currentMandelbrotSet.canvas().width;
    uiCanvas.height = currentMandelbrotSet.canvas().height;
    uiCanvas.className = "canvas";
    canvasDiv.appendChild(currentMandelbrotSet.canvas());
    canvasDiv.appendChild(uiCanvas);
    colourPicker.draw();

    jim.anim.create(render).start();
};


namespace("jim.defaults");
jim.defaults.mandelbrotExtents = jim.rectangle.create(-2.5, -1, 3.5, 2);

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
            return state.palette();
        },
        state: function () {
            return state;
        },
        stop: function () {
            screen.stop();
            console.log('ADun stoppinm');

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
    var currentLocation = "";
    var parallelHistogram = jim.parallelHistogramGenerator.create();
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
                currentLocation = base + path + "#" + hash;
            }
        },
        canvasDiv = document.getElementById("mandelbrotCanvas"),
        examineMenuButton = document.getElementById("pixelInfoButton"),
        examinePixelsPanel = document.getElementById("examinePixels"),
        exportPanel = document.getElementById("exportImagePanel"),
        exportMenuButton = document.getElementById("exportImageButton"),
        pixelInfo = document.getElementById("pixelInfoCanvas"),
        colourPickerCanvas = document.getElementById("colourPickerCanvas"),
        colourGradientCanvas = document.getElementById("colourGradientCanvas"),
        addButton = document.getElementById("addButton"),
        removeButton = document.getElementById("removeButton"),
        bookmarkButton = document.getElementById("bookmarkButton"),
        colourGradientui = jim.colour.gradientui.create(colourGradientCanvas, addButton, removeButton, currentMandelbrotSet.palette(), areaNotifier),
        colourPicker = jim.colour.colourPicker.create(colourPickerCanvas, colourGradientui),
        stopButton = document.getElementById("stop"),
        startButton = document.getElementById("start"),
        exportButton = document.getElementById("export"),
        exportHeight = document.getElementById("exportHeight"),
        exportWidth = document.getElementById("exportWidth"),
        exportDepth = document.getElementById("exportDepth"),
        histogramProgress = document.getElementById("histogramProgress"),
        histogramButton = document.getElementById("showHistogramButton"),
        histogramCanvas = document.getElementById("histogramCanvas"),
        imageProgress = document.getElementById("imageProgress"),
        timeProgress = document.getElementById("elapsedTime"),
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
    var exporting = false;
    var widthMultiplier = 700 / 400; //so when width is set multiply by this to get height
    var heightMultiplier = 400 / 700; // when height is set mult by this to get width
    exportHeight.onkeyup = function () {
        exportWidth.value = exportHeight.value * widthMultiplier;
    };
    exportWidth.onkeyup = function () {
        exportHeight.value = exportWidth.value * heightMultiplier;
    };
    var histogramReporter = {
        report: function (s) {
            histogramProgress.innerText = s;
            imageProgress.innerText = "Incomplete";
        }
    };

    var imageReporter = {
        report: function (s) {
            imageProgress.innerText = s;
            histogramProgress.innerText = "Complete";
        }
    };

    var timeReporter = {
        report: function (s) {
            timeProgress.innerText = s;
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
    areaNotifier.notify({x: initialLocation.topLeft().x, y: initialLocation.topLeft().y, w: initialLocation.width(), h: initialLocation.height()});


    bookmarkButton.onclick = function () {
        window.location = currentLocation;
    };

    var buttonSelected = function (button) {
        return button.getAttribute("class") === "toolbarButtonSelected";
    };


    var toggleButtonSelection = function (button) {
        var newState = buttonSelected(button) ?
            "toolbarButton": "toolbarButtonSelected";
        button.className = newState;
    };

    var setButtonState = function (button, selected) {
        if (selected && !buttonSelected(button)) {
            toggleButtonSelection(button);
        }
        if(!selected && buttonSelected(button)) {
            toggleButtonSelection(button);
        }
    };

    var toggleElementDisplay = function (e) {
        if (e.style.display==="none"){
            e.style.display ="";
        } else {

            e.style.display="none";
        }
    }

    var hide = function (e) {
        e.style.display="none";
    };

    var show = function (e) {
        e.style.display = "";
    };

    examineMenuButton.onclick = function () {
        if (!buttonSelected(examineMenuButton)) {
            toggleButtonSelection(examineMenuButton);
            toggleButtonSelection(exportMenuButton);
            show(examinePixelsPanel);
            hide(exportPanel);
        }
    };

    exportMenuButton.onclick = function () {
        if (!buttonSelected(exportMenuButton)) {
            toggleButtonSelection(exportMenuButton);
            toggleButtonSelection(examineMenuButton);
            show(exportPanel);
            hide(examinePixelsPanel);
        }
    };

    setButtonState(exportMenuButton, true);
    show(exportPanel);
    setButtonState(examineMenuButton, false);
    hide(examinePixelsPanel);

    var imageGenerator = jim.parallelImageGenerator.create();

    events.listenTo("imageComplete", function (e) {
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportWidth.value;
        exportCanvas.height = exportHeight.value;
        var context = exportCanvas.getContext('2d');
        var outImage = context.createImageData(exportCanvas.width, exportCanvas.height);
        outImage.data.set(e.imgData);
        context.putImageData(outImage, 0, 0);
        document.getElementById("export1").href = exportCanvas.toDataURL("image/png");
        exporting = false;
    });

    events.listenTo("histogramExported", function (e) {
        imageGenerator.run(currentMandelbrotSet.state().getExtents(),
            exportDepth.value, exportWidth.value, exportHeight.value,
            e.histogramData, e.histogramTotal, currentMandelbrotSet.palette().toNodeList(), currentMandelbrotSet.state().deadRegions(), "imageComplete", 10);
    });

    exportButton.onclick = function () {
        console.log('About to start to building histogram');
        if (exporting === true) {
            console.log("Not exporting");
            return false ;
        }
        parallelHistogram.run(currentMandelbrotSet.state().getExtents(), exportDepth.value, exportWidth.value / 10, exportHeight.value / 10, "histogramExported", 10);

        console.log("exporting now");
        exporting = true;
    };

    stopButton.onclick = function () {
        currentMandelbrotSet.stop();
        console.log('Finished stopping on click');

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
    hide(histogramCanvas);

    var interpolate = jim.interpolator.create().interpolate;
    var context = histogramCanvas.getContext('2d');
    var drawLine = function (fromX, fromY, toX, toY) {
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.lineWidth = 1;
        context.strokeStyle = 'rgba(30,255,30,255)';
        context.stroke();
    };
    context.strokeStyle = 'rgba(0,255,0,255)';
    context.fillStyle = 'rgba(0,0,0,255)';
    context.fillRect(0,0,700,400);
    var drawHistogram = function (e) {
        context.clearRect(0,0, 700, 400);
        var histogram = jim.twoPhaseHistogram.create(e.histogramData.length);
        histogram.setData(e.histogramData, e.histogramTotal);
        histogram.process();
        for (var i = 0; i < 700; i++) {
            var index = Math.floor(interpolate(0, e.histogramData.length, i / 700));
            drawLine(i, 400, i, 400 - histogram.percentEscapedBy(index) * 400);
        }
    };
    events.listenTo("histogramComplete", drawHistogram);

    histogramButton.onclick  = function () {
        console.log("About to toggle visibility");
        toggleElementDisplay(histogramCanvas);
        parallelHistogram.run(currentMandelbrotSet.state().getExtents(),20000, 140, 80);
    };

    jim.anim.create(render).start();
};


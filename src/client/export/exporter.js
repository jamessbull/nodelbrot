namespace("jim.mandelbrot.image.exporter");

// The deepest export allowed. Every export worker holds a histogram with an entry per iteration, so
// this keeps memory to around 8MB per worker.
jim.mandelbrot.image.exporter.maxDepth = 2000000;

// Reads the export depth the user typed: a whole number of iterations from 1 to maxDepth, with
// commas or spaces allowed between digits. Returns {depth} or {error} explaining what is wrong.
jim.mandelbrot.image.exporter.parseDepth = function (text) {
    "use strict";
    var maxDepth = jim.mandelbrot.image.exporter.maxDepth;
    var digits = String(text).replace(/[,\s]/g, "");
    if (!/^[0-9]+$/.test(digits)) {
        return {error: "Iterations must be a whole number, such as 1000."};
    }
    var depth = parseInt(digits, 10);
    if (depth < 1 || depth > maxDepth) {
        return {error: "Iterations must be between 1 and " + maxDepth.toLocaleString("en-GB") + "."};
    }
    return {depth: depth};
};

jim.mandelbrot.image.exporter.create = function (_exportDimensions, state, _dom, _events) {
    "use strict";
    var exporting = false;

    var exportButton = document.getElementById("export");
    var lastExportButton = document.getElementById("openLastExportButton");
    var exportDepth = document.getElementById("exportDepth");
    var histogramProgress = document.getElementById("histogramProgress");
    var imageProgress = document.getElementById("imageProgress");
    var timeProgress = document.getElementById("elapsedTime");
    var downloadButton = document.getElementById("export1");
    var exportProgress = document.getElementById("exportProgress");
    var exportMessage = document.getElementById("exportMessage");
    var exportDimensions;
    var palette;
    var exportCanvas;
    var exportUrl;
    var timeReporter = jim.common.timeReporter.create(timeProgress);
    var histogramReporter = jim.common.imageExportProgressReporter.create(events, "histogramExportProgress", histogramProgress);
    var imageReporter = jim.common.imageExportProgressReporter.create(events, "imageExportProgress", imageProgress);

    lastExportButton.onclick = function () {
        if (exportUrl) {
            window.open(exportUrl);
        }
    };

    downloadButton.onclick = function () {
        if (exportCanvas) {
            _dom.hide(exportProgress);
            window.open(exportCanvas.toDataURL("image/png"));
        }
    };

    _dom.hide(exportProgress);

    on(_events.paletteChanged, function (_palette) {
        palette = _palette;
    });

    function finish() {
        _dom.deselectButton(exportButton);
        exporting = false;
        timeReporter.stop();
    }

    // Leaves the progress panel open with the reason, so the next export can be started.
    function fail(message) {
        console.error("Export failed: " + message);
        exportMessage.textContent = "Export failed: " + message;
        finish();
    }

    // Browsers limit canvas size, some (such as Safari on phones) below the largest export, so
    // making the image can fail.
    var tooBig = "the browser couldn't make an image this size. Try a smaller size.";

    function showImage(image) {
        try {
            exportCanvas = document.createElement('canvas');
            exportCanvas.width = exportDimensions.width;
            exportCanvas.height = exportDimensions.height;
            exportCanvas.getContext('2d').putImageData(new ImageData(image, exportCanvas.width, exportCanvas.height), 0, 0);
        } catch (e) {
            exportCanvas = undefined;
            fail(tooBig);
            return;
        }
        if (exportCanvas.toBlob) {
            exportCanvas.toBlob(function(blob) {
                if (!blob) {
                    fail(tooBig);
                    return;
                }
                exportUrl  = URL.createObjectURL(blob);
                _dom.hide(exportProgress);
                _dom.removeClass(lastExportButton, "disabled");
                window.open(exportUrl);
            });
        } else {
            _dom.removeClass(lastExportButton, "disabled");
            downloadButton.href = exportCanvas.toDataURL("image/png");
        }
        finish();
    }

    exportButton.onclick = function () {
        if (exporting === true) {
            console.log("Can't export while export already in progress");
            return false ;
        }
        exportUrl = undefined;
        exportMessage.textContent = "";
        _dom.show(exportProgress);
        var depth = jim.mandelbrot.image.exporter.parseDepth(exportDepth.value);
        if (depth.error) {
            exportMessage.textContent = depth.error;
            return false;
        }
        exporting = true;
        exportDimensions = _exportDimensions.dimensions();
        _dom.selectButton(exportButton);
        imageReporter.reportOn(exportDimensions.width, exportDimensions.height);
        histogramReporter.reportOn(Math.floor(exportDimensions.width / 10), Math.floor(exportDimensions.height / 10));
        timeReporter.start();
        // A copy, as moving the view changes the state's extents in place.
        jim.mandelbrot.export.render(state.getExtents().copy(), exportDimensions.width, exportDimensions.height,
            depth.depth, palette, showImage, fail);
    };
};

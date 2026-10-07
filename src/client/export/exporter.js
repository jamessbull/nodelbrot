namespace("jim.mandelbrot.image.exporter");
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
        window.open(exportUrl);
    };

    downloadButton.onclick = function () {
        _dom.hide(exportProgress);
        window.open(exportCanvas.toDataURL("image/png"));
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

    function showImage(image) {
        exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportDimensions.width;
        exportCanvas.height = exportDimensions.height;
        exportCanvas.getContext('2d').putImageData(new ImageData(image, exportCanvas.width, exportCanvas.height), 0, 0);
        if (exportCanvas.toBlob) {
            exportCanvas.toBlob(function(blob) {
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
        exporting = true;
        exportUrl = undefined;
        exportMessage.textContent = "";
        exportDimensions = _exportDimensions.dimensions();
        _dom.selectButton(exportButton);
        _dom.show(exportProgress);
        imageReporter.reportOn(exportDimensions.width, exportDimensions.height);
        histogramReporter.reportOn(Math.floor(exportDimensions.width / 10), Math.floor(exportDimensions.height / 10));
        timeReporter.start();
        // A copy, as moving the view changes the state's extents in place.
        jim.mandelbrot.export.render(state.getExtents().copy(), exportDimensions.width, exportDimensions.height,
            parseInt(exportDepth.value, 10), palette, showImage, fail);
    };
};

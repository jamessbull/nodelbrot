import { renderExport } from "./exportRenderer.js";
import { createProgressReporter, createTimeReporter } from "./progress.js";
import { deselectButton, hide, selectButton, show } from "../dom.js";

// The deepest export allowed. Every export worker holds a histogram with an entry per iteration, so
// this keeps memory to around 8MB per worker.
export const maxDepth = 2000000;

// Reads the export depth the user typed: a whole number of iterations from 1 to maxDepth, with
// commas or spaces allowed between digits. Returns {depth} or {error} explaining what is wrong.
export function parseDepth(text) {
    const digits = String(text).replace(/[,\s]/g, "");
    if (!/^[0-9]+$/.test(digits)) {
        return {error: "Iterations must be a whole number, such as 1000."};
    }
    const depth = parseInt(digits, 10);
    if (depth < 1 || depth > maxDepth) {
        return {error: "Iterations must be between 1 and " + maxDepth.toLocaleString("en-GB") + "."};
    }
    return {depth: depth};
}

// The export panel: exports the current view at the chosen size and depth, with workers made by
// newWorker(), and shows the result.
export function createExporter(_exportDimensions, state, _events, newWorker) {
    let exporting = false;

    const exportButton = document.getElementById("export");
    const lastExportButton = document.getElementById("openLastExportButton");
    const exportDepth = document.getElementById("exportDepth");
    const histogramProgress = document.getElementById("histogramProgress");
    const imageProgress = document.getElementById("imageProgress");
    const timeProgress = document.getElementById("elapsedTime");
    const downloadButton = document.getElementById("export1");
    const exportProgress = document.getElementById("exportProgress");
    const exportMessage = document.getElementById("exportMessage");
    let exportDimensions;
    let palette;
    let exportCanvas;
    let exportUrl;
    const timeReporter = createTimeReporter(timeProgress);
    const progressReporters = {histogram: createProgressReporter(histogramProgress), image: createProgressReporter(imageProgress)};

    lastExportButton.onclick = function () {
        if (exportUrl) {
            window.open(exportUrl);
        }
    };

    downloadButton.onclick = function () {
        if (exportCanvas) {
            hide(exportProgress);
            window.open(exportCanvas.toDataURL("image/png"));
        }
    };

    hide(exportProgress);

    _events.listenTo(_events.paletteChanged, function (_palette) {
        palette = _palette;
    });

    function finish() {
        deselectButton(exportButton);
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
    const tooBig = "the browser couldn't make an image this size. Try a smaller size.";

    function showImage(image) {
        try {
            exportCanvas = document.createElement('canvas');
            exportCanvas.width = exportDimensions.width;
            exportCanvas.height = exportDimensions.height;
            exportCanvas.getContext('2d').putImageData(new ImageData(image, exportCanvas.width, exportCanvas.height), 0, 0);
        } catch {
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
                hide(exportProgress);
                lastExportButton.classList.remove("disabled");
                window.open(exportUrl);
            });
        } else {
            lastExportButton.classList.remove("disabled");
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
        show(exportProgress);
        const depth = parseDepth(exportDepth.value);
        if (depth.error) {
            exportMessage.textContent = depth.error;
            return false;
        }
        exporting = true;
        exportDimensions = _exportDimensions.dimensions();
        selectButton(exportButton);
        progressReporters.image.reportOn(exportDimensions.width, exportDimensions.height);
        progressReporters.histogram.reportOn(Math.floor(exportDimensions.width / 10), Math.floor(exportDimensions.height / 10));
        timeReporter.start();
        // A copy, as moving the view changes the state's extents in place.
        renderExport({
            extents: state.getExtents().copy(), width: exportDimensions.width, height: exportDimensions.height,
            depth: depth.depth, palette: palette, newWorker: newWorker,
            onProgress: (phase, pixels) => progressReporters[phase].add(pixels),
            onComplete: showImage, onError: fail
        });
    };
}

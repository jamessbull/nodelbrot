import { renderExport } from "./exportRenderer.js";
import { createProgressReporter, createTimeReporter } from "./progress.js";
import { deselectButton, hide, selectButton, show } from "../dom.js";
import { rectangle } from "../geometry.js";
import { needsPerturbation } from "../precision.js";
import { renderExportOnGpu } from "../gpu/gpuExport.js";
import { gpuSmallestPixel } from "../gpu/gpuRenderer.js";

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

// The depth to suggest for exporting a view whose last pixel to escape on screen did so at lastEscape:
// a little past it, at two significant figures, and at least 1000.
export function suggestedDepth(lastEscape) {
    const wanted = Math.max(1000, Math.ceil(lastEscape * 1.05));
    const unit = 10 ** (Math.floor(Math.log10(wanted)) - 1);
    return Math.min(maxDepth, Math.ceil(wanted / unit) * unit);
}

// The export panel: exports the current view at the chosen size and depth, with workers made by
// newWorker(), and shows the result. The depth follows the one the view needs, as it renders (see
// suggestedDepth), until the user types one, which holds until the view changes.
// Views the GPU draws (useGpu(view)) are exported on the GPU (see gpuExport.js), if its pixels are big
// enough for it, and the depth small enough, and on the CPU if that fails. Otherwise, deep views (past
// the precision of doubles) are exported by perturbation on the CPU, and the rest iterated directly, as
// that can tell pixels in the main cardioid and bulb, and orbits that settle into a cycle, without
// iterating them to the export's depth. Both GPU and deep exports wait for referenceOrbit to be worked
// out to the export's depth.
export function createExporter({exportSizes, state, events, newWorker, referenceOrbit, useGpu = () => false}) {
    let exporting = false;

    const exportButton = document.getElementById("export");
    const exportDepth = document.getElementById("exportDepth");
    const histogramProgress = document.getElementById("histogramProgress");
    const imageProgress = document.getElementById("imageProgress");
    const timeProgress = document.getElementById("elapsedTime");
    const exportResult = document.getElementById("exportResult");
    const downloadLink = document.getElementById("downloadExport");
    const openLink = document.getElementById("openExport");
    const exportProgress = document.getElementById("exportProgress");
    const exportMessage = document.getElementById("exportMessage");
    let exportDimensions;
    let palette;
    let exportUrl;          // the last export's image, until the next export starts
    const timeReporter = createTimeReporter(timeProgress);
    const progressReporters = {histogram: createProgressReporter(histogramProgress), image: createProgressReporter(imageProgress)};

    hide(exportProgress);

    events.listenTo(events.paletteChanged, function (newPalette) {
        palette = newPalette;
    });

    let depthTyped = false;
    let escapedSoFar = 0;
    exportDepth.addEventListener("input", () => { depthTyped = true; });
    events.listenTo(events.viewChanged, function () {
        depthTyped = false;
        escapedSoFar = 0;
    });
    events.listenTo(events.histogramChanged, function (info) {
        if (info.total > escapedSoFar && !depthTyped) {
            // Pixels escaped in the iterations up to filledLength.
            exportDepth.value = suggestedDepth(info.filledLength);
        }
        escapedSoFar = info.total;
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

    // Makes the image a PNG and offers it as links to download or open, which work where a pop-up
    // opened when the export finished would be blocked. The canvas is only needed to make the PNG.
    function showImage(image) {
        const { width, height } = exportDimensions;
        let canvas;
        try {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').putImageData(new ImageData(image, width, height), 0, 0);
        } catch {
            fail(tooBig);
            return;
        }
        canvas.toBlob(function (blob) {
            canvas.width = canvas.height = 0;
            if (!blob) {
                fail(tooBig);
                return;
            }
            exportUrl = URL.createObjectURL(blob);
            downloadLink.href = openLink.href = exportUrl;
            downloadLink.download = "mandelbrot-" + width + "x" + height + ".png";
            exportResult.hidden = false;
            finish();
        });
    }

    exportButton.onclick = function () {
        if (exporting === true) {
            console.log("Can't export while export already in progress");
            return false ;
        }
        // The last export's image goes, as it can be tens of megabytes.
        if (exportUrl) {
            URL.revokeObjectURL(exportUrl);
            exportUrl = undefined;
        }
        exportResult.hidden = true;
        exportMessage.textContent = "";
        show(exportProgress);
        const depth = parseDepth(exportDepth.value);
        if (depth.error) {
            exportMessage.textContent = depth.error;
            return false;
        }
        exporting = true;
        exportDimensions = exportSizes.dimensions();
        selectButton(exportButton);
        progressReporters.image.reportOn(exportDimensions.width, exportDimensions.height);
        progressReporters.histogram.reportOn(Math.floor(exportDimensions.width / 10), Math.floor(exportDimensions.height / 10));
        timeReporter.start();
        const area = state.getArea();
        const view = state.getView();
        const pixelSize = view.pixelSize;
        const exportPixel = Math.max(area.width() / (exportDimensions.width - 1), area.height() / (exportDimensions.height - 1));
        const orbitThere = referenceOrbit && referenceOrbit.active();
        const onGpu = orbitThere && useGpu(view) && exportPixel >= gpuSmallestPixel && depth.depth < 2 ** 24;
        if (!onGpu && (!orbitThere || !needsPerturbation(view))) {
            startExport(area, null, depth.depth);
            return;
        }
        // The area relative to the reference orbit's point, once the orbit is long enough.
        exportMessage.textContent = "Working out the reference orbit…";
        referenceOrbit.whenLength(depth.depth + 2).then(function (orbit) {
            if (!orbit) {
                fail("the view changed before it could start. Try again.");
                return;
            }
            exportMessage.textContent = "";
            const extents = rectangle(-(area.width() / 2) - (orbit.offset.x * pixelSize), -(area.height() / 2) - (orbit.offset.y * pixelSize),
                area.width(), area.height());
            if (onGpu) {
                // Where the orbit's point is, where doubles can say.
                const point = needsPerturbation(view) ? null : {x: area.topLeft().x + (area.width() / 2) + (orbit.offset.x * pixelSize),
                    y: area.topLeft().y + (area.height() / 2) + (orbit.offset.y * pixelSize)};
                startGpuExport(extents, orbit, point, depth.depth, function () {
                    // The CPU instead, as it would have done it.
                    if (needsPerturbation(view)) {
                        startExport(extents, orbit, depth.depth);
                    } else {
                        startExport(area, null, depth.depth);
                    }
                });
            } else {
                startExport(extents, orbit, depth.depth);
            }
        });
    };

    function startGpuExport(extents, orbit, point, depth, onFailure) {
        exportMessage.textContent = "Rendering on the GPU…";
        // The GPU counts escapes over the whole image as it goes, without a separate histogram phase.
        progressReporters.histogram.add(Math.floor(exportDimensions.width / 10) * Math.floor(exportDimensions.height / 10));
        renderExportOnGpu({
            extents, orbit: {values: orbit.values, complete: orbit.complete}, point, palette, depth,
            width: exportDimensions.width, height: exportDimensions.height,
            onProgress: (phase, pixels) => progressReporters[phase].add(pixels),
            onComplete: function (image) {
                exportMessage.textContent = "";
                showImage(image);
            },
            onError: function (message) {
                console.warn("Exporting on the CPU, as the GPU couldn't: " + message);
                exportMessage.textContent = "";
                progressReporters.image.reportOn(exportDimensions.width, exportDimensions.height);
                onFailure();
            }
        });
    }

    function startExport(extents, orbit, depth) {
        renderExport({
            orbit: orbit && {generation: orbit.generation, values: orbit.values, complete: orbit.complete},
            extents: extents, width: exportDimensions.width, height: exportDimensions.height,
            depth: depth, palette: palette, newWorker: newWorker,
            onProgress: (phase, pixels) => progressReporters[phase].add(pixels),
            onComplete: showImage, onError: fail
        });
    }
}

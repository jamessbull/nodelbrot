import { createEvents } from "./events.js";
import { rectangle } from "./geometry.js";
import { workerCount } from "./workerPool.js";
import { createInteractiveRenderer } from "./interactiveRenderer.js";
import { createAutoStop, createEscapeHistogram, createImageRenderer, createViewState, initialHistogramSize } from "./mandelbrotEscape.js";
import { createPalette } from "./palette.js";
import { createStopwatch } from "./stopWatch.js";
import { createMetrics, showFps, systemClock } from "./metrics.js";
import { createSelection } from "./selection.js";
import { createViewInteraction } from "./ui/mandelbrotViewUIPolicy.js";
import { createSelectionDrawer } from "./ui/actions/drawSelection.js";
import { createZoomInAnimation } from "./ui/actions/zoomInAnimation.js";
import { createZoomOutAnimation } from "./ui/actions/zoomOutAnimation.js";
import { createZoomIn } from "./ui/actions/zoomIn.js";
import { createZoomOut } from "./ui/actions/zoomOut.js";
import { createMove } from "./ui/actions/move.js";
import { createNotice } from "./ui/notice.js";
import { precisionWarning } from "./precision.js";
import { createPixelExaminer } from "./magnifiedDisplay.js";
import { createGradientEditor } from "./colourGradient.js";
import { createColourPicker } from "./colourPicker.js";
import { createExportSizes } from "./exportDropdown.js";
import { createControls } from "./uiElements.js";
import { createBookmarks } from "./bookMark.js";
import { element } from "./dom.js";

// Starts the explorer on the page, rendering with workers made by newWorker(). Its events go out in a
// "nodelbrotstart" event on window before anything happens, and are returned, for development tools.
export function startApp(newWorker) {
    const events = createEvents();
    window.dispatchEvent(new CustomEvent("nodelbrotstart", { detail: events }));
    const displayWidth = 700;
    const displayHeight = 400;
    const pixels = displayWidth * displayHeight;

    const mainCanvas = element("mandelbrotCanvas");
    const uiCanvas = element("uiCanvas");
    const pixelInfoCanvas = element("pixelInfoCanvas");
    mainCanvas.width = uiCanvas.width = displayWidth;
    mainCanvas.height = uiCanvas.height = displayHeight;
    pixelInfoCanvas.width = pixelInfoCanvas.height = 144;
    // The right button drags the view, so it mustn't open the browser's menu.
    mainCanvas.oncontextmenu = uiCanvas.oncontextmenu = (e) => e.preventDefault();

    const imgData = new Uint8ClampedArray(pixels * 4);
    const escapeValues = new Uint32Array(pixels);
    const imageEscapeValues = new Uint32Array(pixels);
    const xState = new Float64Array(pixels);
    const yState = new Float64Array(pixels);

    const state = createViewState(displayWidth, displayHeight, rectangle(-2.5, -1, 3.5, 2), events);
    const renderer = createInteractiveRenderer({
        width: displayWidth, height: displayHeight, events: events, workers: workerCount(), newWorker: newWorker,
        imgData: imgData, escapeValues: escapeValues, xState: xState, yState: yState, imageEscapeValues: imageEscapeValues
    });

    createViewInteraction(uiCanvas, events);
    const drawSelection = createSelectionDrawer();
    const zoomInAnimation = createZoomInAnimation(uiCanvas, mainCanvas, drawSelection);
    const zoomOutAnimation = createZoomOutAnimation(uiCanvas, mainCanvas, drawSelection);
    createZoomOut(events, createStopwatch(), zoomOutAnimation, mainCanvas, state);
    createZoomIn(mainCanvas, uiCanvas, events, createSelection(rectangle(0, 0, displayWidth, displayHeight)), zoomInAnimation);
    createMove(events, mainCanvas, uiCanvas);

    createMetrics(systemClock, events);
    showFps(element("framesPerSecond"), events);
    createEscapeHistogram(events, new Uint32Array(initialHistogramSize));
    createImageRenderer(events, mainCanvas, displayWidth, displayHeight);
    createPixelExaminer(events, pixelInfoCanvas, imgData, xState, yState, escapeValues, imageEscapeValues, displayWidth, uiCanvas, displayHeight, state);
    createAutoStop(events, pixels);

    const palette = createPalette();
    const gradientEditor = createGradientEditor(element("colourGradientCanvas"), element("addButton"), element("removeButton"), palette, events);
    const paletteBlendSelect = element("paletteBlendSelect");
    paletteBlendSelect.onchange = function () {
        palette.setBlend(paletteBlendSelect.value);
        events.fire(events.paletteChanged, palette);
        events.fire(events.pulseUI);
    };
    // Keeps the selector right when a bookmark changes the blend.
    events.listenTo(events.paletteChanged, () => { paletteBlendSelect.value = palette.blend(); });

    const notice = createNotice(uiCanvas);
    precisionWarning(events, notice, displayWidth);
    const bookmarks = createBookmarks(element("bookmarkButton"), state, gradientEditor, events, notice);
    createColourPicker(element("colourPickerCanvas"), gradientEditor, events);
    const exportSizes = createExportSizes(element("exportSizeSelect"),
        ["smallExport", "mediumExport", "largeExport", "veryLargeExport"].map(element));
    createControls(exportSizes, state, events, newWorker);

    const maxIteration = element("maxIteration");
    const lastEscapedOn = element("lastPointEscapedAt");
    let lastTotal = 0;
    events.listenTo(events.histogramUpdated, function (histoInfo) {
        maxIteration.innerText = histoInfo.currentIteration;
        if (histoInfo.total > lastTotal) {
            lastEscapedOn.innerText = histoInfo.currentIteration;
        }
        lastTotal = histoInfo.total;
    });

    const help = element("helptext");
    element("helptextbutton").onclick = () => help.showModal();
    element("closehelp").onclick = () => help.close();
    // A click on the backdrop, outside the dialog's box, closes it too.
    help.addEventListener("click", (e) => {
        const box = help.getBoundingClientRect();
        if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) {
            help.close();
        }
    });

    events.fire(events.paletteChanged, palette);
    bookmarks.changeLocation();
    // Start once the view and palette are set, so the first batch isn't for a placeholder view.
    renderer.start();

    return { events: events };
}

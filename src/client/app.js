import { createEvents } from "./events.js";
import { rectangle } from "./geometry.js";
import { createEscapeHistogram, initialHistogramSize } from "./escapeHistogram.js";
import { createViewState } from "./viewState.js";
import { createPalette } from "./palette.js";
import { createStopwatch } from "./stopwatch.js";
import { createMetrics, showFps, systemClock } from "./metrics.js";
import { createViewInteraction } from "./ui/viewInteraction.js";
import { createSelectionDrawer } from "./ui/actions/drawSelection.js";
import { createZoomOutAnimation } from "./ui/actions/zoomOutAnimation.js";
import { createZoomOut } from "./ui/actions/zoomOut.js";
import { createMove } from "./ui/actions/move.js";
import { createTouchGestures } from "./ui/touchGestures.js";
import { createNotice } from "./ui/notice.js";
import { createGradientEditor } from "./colourGradient.js";
import { createColourPicker } from "./colourPicker.js";
import { createExportSizes } from "./export/exportSizes.js";
import { createControls } from "./controls.js";
import { createBookmarks } from "./bookmarks.js";
import { createDisplay } from "./display.js";
import { deselectButton, element, selectButton } from "./dom.js";

// The smallest display, in pixels.
const minWidth = 160;
const minHeight = 120;

// Starts the explorer on the page, rendering with workers made by newWorker(). Its events go out in a
// "nodelbrotstart" event on window before anything happens, and are returned, for development tools.
// The display fills the space the page gives it and is made again at the new size when that changes.
export function startApp(newWorker) {
    const events = createEvents();
    window.dispatchEvent(new CustomEvent("nodelbrotstart", { detail: events }));

    const viewer = element("viewer");
    const mainCanvas = element("mandelbrotCanvas");
    const uiCanvas = element("uiCanvas");
    const pixelInfoCanvas = element("pixelInfoCanvas");
    pixelInfoCanvas.width = pixelInfoCanvas.height = 144;
    // The right button drags the view, so it mustn't open the browser's menu.
    mainCanvas.oncontextmenu = uiCanvas.oncontextmenu = (e) => e.preventDefault();

    // The display's size: all the space in the viewer, less the border round the image.
    function displaySize() {
        const border = 2;
        return {
            width: Math.max(minWidth, Math.floor(viewer.clientWidth) - border),
            height: Math.max(minHeight, Math.floor(viewer.clientHeight) - border)
        };
    }
    const size = displaySize();

    const state = createViewState(size.width, size.height, rectangle(-2.5, -1, 3.5, 2), events);
    createViewInteraction(uiCanvas, events);
    const drawSelection = createSelectionDrawer();
    const zoomOut = createZoomOut(events, createStopwatch(), createZoomOutAnimation(uiCanvas, mainCanvas, drawSelection), mainCanvas, state);
    element("zoomOutButton").onclick = zoomOut.zoomOut;
    createMove(events, mainCanvas, uiCanvas);
    createTouchGestures(uiCanvas, mainCanvas, {
        onTransform: (change) => events.fire(events.transformAction, change),
        onDoubleTap: zoomOut.zoomOut,
        enabled: () => element("examinePixels").hidden
    });
    createMetrics(systemClock, events);
    showFps(element("framesPerSecond"), events);
    createEscapeHistogram(events, new Uint32Array(initialHistogramSize));

    // The colour canvases are as wide as a narrow screen, up to their usual size, and the page scales
    // them down further if it needs to.
    const colourGradientCanvas = element("colourGradientCanvas");
    const colourPickerCanvas = element("colourPickerCanvas");
    const paletteWidth = Math.min(colourPickerCanvas.width, document.documentElement.clientWidth - 20);
    colourPickerCanvas.width = paletteWidth;
    colourGradientCanvas.width = Math.min(colourGradientCanvas.width, paletteWidth);

    // On a narrow screen the colours are a sheet over the image, opened from the toolbar.
    const app = element("allContent");
    const coloursButton = element("coloursButton");
    coloursButton.onclick = function () {
        const open = app.classList.toggle("coloursOpen");
        coloursButton.setAttribute("aria-expanded", String(open));
        (open ? selectButton : deselectButton)(coloursButton);
    };

    const palette = createPalette();
    const gradientEditor = createGradientEditor(colourGradientCanvas, element("addButton"), element("removeButton"), palette, events);
    const paletteBlendSelect = element("paletteBlendSelect");
    paletteBlendSelect.onchange = function () {
        palette.setBlend(paletteBlendSelect.value);
        events.fire(events.paletteChanged, palette);
        events.fire(events.pulseUI);
    };
    // Keeps the selector right when a bookmark changes the blend.
    events.listenTo(events.paletteChanged, () => { paletteBlendSelect.value = palette.blend(); });

    const notice = createNotice(uiCanvas);
    const bookmarks = createBookmarks(element("bookmarkButton"), state, gradientEditor, events, notice);
    createColourPicker(colourPickerCanvas, gradientEditor, events);
    const exportSizes = createExportSizes(element("exportSizeSelect"),
        ["smallExport", "mediumExport", "largeExport", "veryLargeExport"].map(element), size.width, size.height);
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

    const newDisplay = (width, height) => createDisplay({
        events: events, width: width, height: height, mainCanvas: mainCanvas, uiCanvas: uiCanvas, pixelInfoCanvas: pixelInfoCanvas,
        state: state, notice: notice, drawSelection: drawSelection, newWorker: newWorker
    });
    let display = newDisplay(size.width, size.height);

    // Makes the display again at the viewer's new size, keeping the view's centre and zoom. Examining
    // pixels stops, as the image it was examining is gone.
    function resizeDisplay() {
        const newSize = displaySize();
        if (newSize.width === display.width && newSize.height === display.height) {
            return;
        }
        if (!element("examinePixels").hidden) {
            element("pixelInfoButton").click();
        }
        display.dispose();
        state.resize(newSize.width, newSize.height);
        exportSizes.setDisplaySize(newSize.width, newSize.height);
        display = newDisplay(newSize.width, newSize.height);
        // The new workers need the view and the palette.
        events.fire(events.extentsUpdate, state.getExtents());
        events.fire(events.paletteChanged, palette);
        display.start();
    }
    let resizeTimer;
    new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeDisplay, 150);
    }).observe(viewer);

    events.fire(events.paletteChanged, palette);
    bookmarks.changeLocation();
    // Start once the view and palette are set, so the first batch isn't for a placeholder view.
    display.start();

    return { events: events };
}

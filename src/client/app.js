import { createEvents } from "./events.js";
import { createEscapeHistogram, initialHistogramSize } from "./escapeHistogram.js";
import { createViewState } from "./viewState.js";
import { viewShowing } from "./view.js";
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
import { depthWarning } from "./precision.js";
import { createReferenceOrbit } from "./referenceOrbit.js";
import { needsPerturbation } from "./precision.js";
import { gpuAvailable } from "./gpu/gl.js";
import { createRendererChoice } from "./rendererChoice.js";
import { createDepthGauge } from "./depthGauge.js";
import { gpuLongestOrbit } from "./gpu/gpuRenderer.js";
import { createPaletteEditor } from "./paletteEditor.js";
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
    const magnifier = element("pixelInfoCanvas");
    magnifier.width = magnifier.height = 144;
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

    const state = createViewState(size.width, size.height, viewShowing(-0.75, 0, 3.5, 2, size.width, size.height), events);
    createViewInteraction(uiCanvas, events);
    const drawSelection = createSelectionDrawer();
    const zoomOut = createZoomOut({
        events, timer: createStopwatch(), zoomOutAnim: createZoomOutAnimation(uiCanvas, mainCanvas, drawSelection),
        mandelbrotCanvas: mainCanvas, mandelbrotState: state
    });
    element("zoomOutButton").onclick = zoomOut.zoomOut;
    createMove({events, mandelbrotCanvas: mainCanvas, uiCanvas});
    createTouchGestures(uiCanvas, mainCanvas, {
        onTransform: (change) => events.fire(events.transformView, change),
        onDoubleTap: zoomOut.zoomOut,
        enabled: () => element("examinePixels").hidden
    });
    createMetrics(systemClock, events);
    showFps(element("framesPerSecond"), events);
    createEscapeHistogram(events, new Uint32Array(initialHistogramSize));

    // On a narrow screen the colours are a sheet over the image, opened from the toolbar.
    const app = element("allContent");
    const coloursButton = element("coloursButton");
    coloursButton.onclick = function () {
        const open = app.classList.toggle("coloursOpen");
        coloursButton.setAttribute("aria-expanded", String(open));
        (open ? selectButton : deselectButton)(coloursButton);
    };

    const palette = createPalette();
    createPaletteEditor({
        events, palette, bar: element("paletteBar"), markerTrack: element("paletteMarkers"), shades: element("paletteShades"),
        hues: element("paletteHues"), addButton: element("addButton"), removeButton: element("removeButton"),
        blendSelect: element("paletteBlendSelect")
    });

    const notice = createNotice(element("notice"));
    depthWarning({events, notice, badge: element("depthBadge")});
    createDepthGauge({events, element: element("depthGauge")});
    // The GPU renders every view, where it can, unless the CPU is chosen. See rendererChoice.js.
    let storage = null;
    try {
        storage = window.localStorage;
    } catch {
        // Kept for this visit only, then.
    }
    const rendererChoice = createRendererChoice({select: element("rendererSelect"), gpuAvailable: gpuAvailable(),
        requested: new URLSearchParams(window.location.search).get("renderer"), storage});
    const rendererFor = rendererChoice.rendererFor;
    // The GPU renders every view by perturbation, so needs a reference orbit for every view.
    // It looks for a nucleus about as far from the centre as the corners of a big display.
    const referenceOrbit = createReferenceOrbit({events, newWorker, needed: (view) => rendererFor(view) === "gpu" || needsPerturbation(view),
        searchRadius: 1000, longest: (view) => (rendererFor(view) === "gpu" ? gpuLongestOrbit : Infinity)});
    const bookmarks = createBookmarks({bookmarkButton: element("bookmarkButton"), state, events, notice});
    const exportSizes = createExportSizes(element("exportSizeSelect"),
        ["smallExport", "mediumExport", "largeExport", "veryLargeExport"].map(element), size.width, size.height);
    createControls({exportSizes, state, events, newWorker, referenceOrbit, useGpu: (view) => rendererFor(view) === "gpu"});

    const maxIteration = element("maxIteration");
    const lastEscapedOn = element("lastPointEscapedAt");
    let lastTotal = 0;
    events.listenTo(events.histogramChanged, function (histoInfo) {
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

    function newDisplay(width, height, renderer) {
        const options = {
            events: events, width: width, height: height, mainCanvas: mainCanvas, uiCanvas: uiCanvas, magnifier: magnifier,
            examineHint: element("examineHint"), state: state, drawSelection: drawSelection, newWorker: newWorker,
            referenceOrbit: referenceOrbit, renderer: renderer
        };
        try {
            return createDisplay(options);
        } catch (e) {
            if (renderer !== "gpu") throw e;
            console.warn("Rendering on the CPU, as the GPU renderer couldn't start:", e);
            rendererChoice.unavailable();
            return createDisplay(Object.assign(options, {renderer: "cpu"}));
        }
    }
    let display = newDisplay(size.width, size.height, rendererFor(state.getView()));
    rendererChoice.showInUse(display.renderer, state.getView());

    // Makes the display again, at the viewer's new size or with another renderer, keeping the view's
    // centre and zoom. Examining pixels stops, as the image it was examining is gone.
    function remakeDisplay(newSize, renderer) {
        if (!element("examinePixels").hidden) {
            element("pixelInfoButton").click();
        }
        display.dispose();
        state.resize(newSize.width, newSize.height);
        exportSizes.setDisplaySize(newSize.width, newSize.height);
        display = newDisplay(newSize.width, newSize.height, renderer);
        rendererChoice.showInUse(display.renderer, state.getView());
        // The new renderer needs the view and the palette.
        events.fire(events.viewChanged, state.getView());
        events.fire(events.paletteChanged, palette);
        display.start();
    }

    function resizeDisplay() {
        const newSize = displaySize();
        if (newSize.width !== display.width || newSize.height !== display.height) {
            remakeDisplay(newSize, display.renderer);
        }
    }

    // A view the other renderer is for gets a display with that one, once the view has been taken in.
    function matchRenderer() {
        if (rendererFor(state.getView()) === display.renderer) {
            rendererChoice.showInUse(display.renderer, state.getView());
            return;
        }
        setTimeout(function () {
            const renderer = rendererFor(state.getView());
            if (renderer !== display.renderer) {
                remakeDisplay({width: display.width, height: display.height}, renderer);
            }
        }, 0);
    }
    events.listenTo(events.viewChanged, function (view) {
        if (view.x !== undefined) {
            matchRenderer();
        }
    });
    rendererChoice.onChange(matchRenderer);
    // The GPU gets another go when the user next moves the view (see rendererChoice.js).
    [events.zoomToSelection, events.zoomOut, events.moveBy, events.transformView].forEach((event) => events.listenTo(event, function () {
        rendererChoice.moved();
        matchRenderer();
    }));
    events.listenTo(events.rendererLost, function () {
        rendererChoice.lost();
        notice.show("The GPU stopped working, so the CPU is drawing the view for now.");
        setTimeout(() => remakeDisplay({width: display.width, height: display.height}, "cpu"), 0);
    });
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

import { workerCount } from "./workerPool.js";
import { createInteractiveRenderer } from "./interactiveRenderer.js";
import { createGpuRenderer } from "./gpu/gpuRenderer.js";
import { createAutoStop } from "./autoStop.js";
import { createImageRenderer } from "./imageRenderer.js";
import { createSelection } from "./selection.js";
import { rectangle } from "./geometry.js";
import { createZoomInAnimation } from "./ui/actions/zoomInAnimation.js";
import { createZoomIn } from "./ui/actions/zoomIn.js";
import { createPixelExaminer } from "./pixelExaminer.js";

// The parts of the explorer that depend on the size of the display: the renderer and the buffers it
// renders into, drawing the image, examining pixels, stopping on its own and zooming in. When the display
// changes size, or the renderer changes, these are disposed of and made again, so they listen through a
// scope of the events, which dispose() removes along with the renderer. renderer is "gpu" (see
// gpuRenderer.js) or "cpu" (see interactiveRenderer.js); if the GPU renderer can't start, this throws.
export function createDisplay({events, width, height, mainCanvas, uiCanvas, magnifier, examineHint, state, drawSelection, newWorker,
        referenceOrbit, renderer: kind = "cpu"}) {
    const scoped = events.scope();
    const pixels = width * height;
    const imgData = new Uint8ClampedArray(pixels * 4);
    const escapeValues = new Uint32Array(pixels);
    const imageEscapeValues = new Uint32Array(pixels);
    const xState = new Float64Array(pixels);
    const yState = new Float64Array(pixels);

    mainCanvas.width = uiCanvas.width = width;
    mainCanvas.height = uiCanvas.height = height;

    const buffers = {width, height, events: scoped, imgData, escapeValues, xState, yState, imageEscapeValues, referenceOrbit};
    let renderer;
    try {
        renderer = kind === "gpu" ? createGpuRenderer(buffers)
            : createInteractiveRenderer(Object.assign({workers: workerCount(), newWorker: newWorker}, buffers));
    } catch (e) {
        scoped.dispose();
        throw e;
    }
    createImageRenderer({events: scoped, canvas: mainCanvas, imgData: imgData, width: width, height: height});
    createPixelExaminer({
        events: scoped, magnifier, hint: examineHint, imgData, xState, yState, escapeValues, imageEscapeValues, width, height, state
    });
    createAutoStop(scoped, pixels);
    createZoomIn({
        mandelbrotCanvas: mainCanvas, uiCanvas, events: scoped, selection: createSelection(rectangle(0, 0, width, height)),
        zoomAnim: createZoomInAnimation(uiCanvas, mainCanvas, drawSelection)
    });

    return {
        width: width,
        height: height,
        renderer: kind,
        start: renderer.start,
        dispose: function () {
            renderer.destroy();
            scoped.dispose();
        }
    };
}

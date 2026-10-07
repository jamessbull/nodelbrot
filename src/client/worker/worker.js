import { createInteractiveWorker } from "./interactiveWorker.js";
import { createHistogramExportWorker } from "./histogramExportWorker.js";
import { createImageExportWorker } from "./imageExportWorker.js";
import { createReferenceOrbitWorker } from "./referenceOrbit.js";
import { createOrbitStore } from "./perturbationIterator.js";

// The code a web worker runs: the interactive view, both phases of an image export, and reference orbits
// (in a worker of their own, as they take a while). Each message goes to the part named by its
// workerMessageType. Returns the worker's message handler; replies go to postMessage(message, transfer).
export function createWorkerHandler(postMessage) {
    // The reference orbit for an export of a deep view, which comes in exportorbit messages first.
    const exportOrbit = createOrbitStore();
    const handlers = {
        uiworker: createInteractiveWorker(postMessage),
        histogramexportworker: createHistogramExportWorker(postMessage, exportOrbit),
        imageexportworker: createImageExportWorker(postMessage, exportOrbit),
        referenceorbit: createReferenceOrbitWorker(postMessage),
        exportorbit: {onmessage: (e) => exportOrbit.add(e.data.orbit.generation, 0, e.data.orbit.values, e.data.orbit.escaped)}
    };
    return function (e) {
        const handler = handlers[e.data.workerMessageType];
        if (handler) {
            handler.onmessage(e);
        }
    };
}

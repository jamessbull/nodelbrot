import { createInteractiveWorker } from "./interactiveWorker.js";
import { createImageExportWorker } from "./imageExportWorker.js";
import { createReferenceOrbitWorker } from "./referenceOrbit.js";
import { createOrbitStore } from "./perturbationIterator.js";
import { createNucleusWorker } from "./nucleus.js";

// The code a web worker runs: the interactive view, strips of an image export, reference orbits and
// the search for nuclei to base them on (each in a worker of its own, as they take a while). Each message
// goes to the part named by its workerMessageType. Returns the worker's message handler; replies go to postMessage(message, transfer).
export function createWorkerHandler(postMessage) {
    // The reference orbit for an export of a deep view, which comes in exportorbit messages first.
    const exportOrbit = createOrbitStore();
    const handlers = {
        uiworker: createInteractiveWorker(postMessage),
        imageexportworker: createImageExportWorker(postMessage, exportOrbit),
        referenceorbit: createReferenceOrbitWorker(postMessage),
        nucleus: createNucleusWorker(postMessage),
        exportorbit: {onmessage: (e) => exportOrbit.add(e.data.orbit.generation, 0, e.data.orbit.values, e.data.orbit.complete,
            e.data.orbit.loopTo)}
    };
    return function (e) {
        const handler = handlers[e.data.workerMessageType];
        if (handler) {
            handler.onmessage(e);
        }
    };
}

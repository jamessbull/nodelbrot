import { createInteractiveWorker } from "./interactiveWorker.js";
import { createHistogramExportWorker } from "./histogramExportWorker.js";
import { createImageExportWorker } from "./imageExportWorker.js";

// The code a web worker runs: the interactive view, and both phases of an image export. Each message
// goes to the part named by its workerMessageType. Returns the worker's message handler; replies go
// to postMessage(message, transfer).
export function createWorkerHandler(postMessage) {
    const handlers = {
        uiworker: createInteractiveWorker(postMessage),
        histogramexportworker: createHistogramExportWorker(postMessage),
        imageexportworker: createImageExportWorker(postMessage)
    };
    return function (e) {
        const handler = handlers[e.data.workerMessageType];
        if (handler) {
            handler.onmessage(e);
        }
    };
}

// The explorer's one script, for both the page and its web workers: run by a worker it starts the
// worker, and on the page it starts the explorer, which starts workers from this same script. The
// exports are for dev/workerCheck.js, which runs the rendering in Node.
import { createWorkerHandler } from "./worker/worker.js";
import { startApp } from "./app.js";

export { createWorkerHandler };
export { createEvents } from "./events.js";
export { createInteractiveRenderer } from "./interactiveRenderer.js";
export { createEscapeHistogram, initialHistogramSize } from "./escapeHistogram.js";
export { createPalette } from "./palette.js";
export { rectangle } from "./geometry.js";
export { viewAt } from "./view.js";
export { renderExport } from "./export/exportRenderer.js";
export { renderFragments } from "./workerMessages.js";
export { calculatePoint } from "./mandelbrotPoint.js";

if (typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope) {
    self.onmessage = createWorkerHandler((message, transfer) => self.postMessage(message, transfer));
} else if (typeof document !== "undefined") {
    const scriptUrl = import.meta.url;
    try {
        window.nodelbrot = startApp(() => new Worker(scriptUrl, { type: "module" }));
    } finally {
        // Fade the page in even if starting up failed, rather than leaving it blank.
        const allContent = document.getElementById("allContent");
        allContent.classList.remove("transparent");
        allContent.classList.add("fade");
    }
}

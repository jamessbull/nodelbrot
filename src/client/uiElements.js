import { createExporter } from "./export/exporter.js";
import { deselectButton, selectButton, show } from "./dom.js";

// The Stop, Go and Examine buttons, and the export panel, which makes workers with newWorker().
export function createControls(_exportSizeDropdown, _state, _events, newWorker) {
    const on = _events.listenTo;

    const stopButton         = document.getElementById("stop");
    const startButton        = document.getElementById("start");

    selectButton(startButton);

    on(_events.start, function () {
        selectButton(startButton);
        deselectButton(stopButton);
    });

    on(_events.restart, function () {
        selectButton(startButton);
        deselectButton(stopButton);
    });

    on(_events.stop, function () {
        selectButton(stopButton);
        deselectButton(startButton);
    });

    startButton.onclick = function () {
        _events.fire(_events.start);
    };

    stopButton.onclick = function () {
        _events.fire(_events.stop);
    };

    const examineMenuButton  = document.getElementById("pixelInfoButton");
    const examinePixelsPanel = document.getElementById("examinePixels");
    const exportPanel        = document.getElementById("exportImagePanel");
    const mandelCanvas       = document.getElementById("mandelbrotCanvas");

    examineMenuButton.onclick = function () {
        if (examineMenuButton.classList.contains("buttonSelected")) {
            deselectButton(examineMenuButton);
            mandelCanvas.classList.remove("magnifyCursor");
            _events.fire(_events.stopExaminingPixelState);

        } else{
            selectButton(examineMenuButton);
            mandelCanvas.classList.add("magnifyCursor");
            _events.fire(_events.stop);
            _events.fire(_events.examinePixelState);
        }
    };

    show(exportPanel);
    deselectButton(examineMenuButton);
    show(examinePixelsPanel);

    createExporter(_exportSizeDropdown, _state, _events, newWorker);
}

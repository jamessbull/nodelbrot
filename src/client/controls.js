import { createExporter } from "./export/exporter.js";
import { deselectButton, element, selectButton } from "./dom.js";

// Opens and closes a pop-over panel from its button. It closes on a second click of the button, a
// click anywhere outside it, or Escape.
function popover(button, panel) {
    function setOpen(open) {
        panel.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
        (open ? selectButton : deselectButton)(button);
    }
    button.addEventListener("click", () => setOpen(panel.hidden));
    document.addEventListener("pointerdown", (e) => {
        if (!panel.hidden && !panel.contains(e.target) && !button.contains(e.target)) {
            setOpen(false);
        }
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !panel.hidden) {
            setOpen(false);
            button.focus();
        }
    });
}

// The Stop, Go, Examine and Export buttons. The export makes workers with newWorker().
export function createControls(_exportSizeDropdown, _state, _events, newWorker) {
    const on = _events.listenTo;

    const stopButton = element("stop");
    const startButton = element("start");

    function showRunning(running) {
        (running ? selectButton : deselectButton)(startButton);
        (running ? deselectButton : selectButton)(stopButton);
    }
    showRunning(true);
    on(_events.start, () => showRunning(true));
    on(_events.restart, () => showRunning(true));
    on(_events.stop, () => showRunning(false));
    startButton.onclick = () => _events.fire(_events.start);
    stopButton.onclick = () => _events.fire(_events.stop);

    // Examining pixels stops rendering, so the pixels stay put, and shows the examine panel over the
    // image until it is turned off.
    const examineButton = element("pixelInfoButton");
    const examinePanel = element("examinePixels");
    const uiCanvas = element("uiCanvas");
    examineButton.onclick = function () {
        const examining = examinePanel.hidden;
        examinePanel.hidden = !examining;
        uiCanvas.classList.toggle("magnifyCursor", examining);
        if (examining) {
            selectButton(examineButton);
            _events.fire(_events.stop);
            _events.fire(_events.startExamining);
        } else {
            deselectButton(examineButton);
            _events.fire(_events.stopExamining);
        }
    };

    popover(element("exportMenuButton"), element("exportImagePanel"));
    createExporter(_exportSizeDropdown, _state, _events, newWorker);
}

const storageKey = "nodelbrot.renderer";

// Which renderer draws each view: the GPU (see gpuRenderer.js) or the CPU (interactiveRenderer.js).
// "auto", the default, has the GPU draw every view where the browser has one that works, and "cpu" has
// the CPU draw every view. The choice is made with select
// (a <select> of those two), kept in storage (localStorage, which may be missing or refuse), and
// ?renderer=cpu or ?renderer=gpu (or auto) in the address (requested) overrides it for the visit.
//
// If the GPU renderer can't start (unavailable()), Auto leaves the GPU alone from then on. If it stops
// working (lost(), when the browser takes its WebGL context away), Auto leaves it alone until the user
// next moves the view (moved()), and from then on after it has happened three times.
//
// rendererFor(view) is the renderer for a view, showInUse(renderer, view) puts it in the select's Auto
// option ("Auto (GPU)"), with why in its title, and onChange(listener) hears of changes of choice.
export function createRendererChoice({select, gpuAvailable, requested = null, storage = null}) {
    let choice = requested === "cpu" ? "cpu" : requested ? "auto" : stored() || "auto";
    let gpuWorks = gpuAvailable;
    let heldOff = false;
    let losses = 0;
    const listeners = [];

    function stored() {
        try {
            const value = storage && storage.getItem(storageKey);
            return value === "cpu" || value === "auto" ? value : null;
        } catch {
            return null;
        }
    }

    function store() {
        try {
            if (storage) storage.setItem(storageKey, choice);
        } catch {
            // Not kept, then: it still holds for this visit.
        }
    }

    const autoOption = () => Array.from(select.options).find((option) => option.value === "auto");

    select.value = choice;
    select.addEventListener("change", function () {
        choice = select.value === "cpu" ? "cpu" : "auto";
        store();
        listeners.forEach((listener) => listener(choice));
    });

    // Why Auto has the CPU draw a view, or null if it has the GPU draw it.
    function whyNotGpu(view) {
        if (!gpuWorks) return "this browser has no WebGL2 GPU rendering";
        if (heldOff) return "the GPU stopped working";
        return null;
    }

    return {
        choice: () => choice,
        rendererFor: (view) => (choice === "auto" && whyNotGpu(view) === null ? "gpu" : "cpu"),
        unavailable: function () {
            gpuWorks = false;
        },
        lost: function () {
            losses += 1;
            heldOff = true;
            if (losses >= 3) {
                gpuWorks = false;
            }
        },
        moved: function () {
            heldOff = false;
        },
        showInUse: function (renderer, view) {
            const option = autoOption();
            option.textContent = "Auto (" + renderer.toUpperCase() + ")";
            const why = choice === "cpu" ? "The CPU draws every view, as chosen." : renderer === "gpu"
                ? "The GPU draws this view." : "The CPU draws this view, as " + whyNotGpu(view) + ".";
            select.title = "What draws the view: Auto has the GPU draw it where it can. " + why;
        },
        onChange: (listener) => listeners.push(listener)
    };
}

const buttonSelectedClass = "buttonSelected";

export function element(id) {
    return document.getElementById(id);
}

export function selectButton(button) {
    button.classList.add(buttonSelectedClass);
}

export function deselectButton(button) {
    button.classList.remove(buttonSelectedClass);
}

export function hide(e) {
    e.style.display = "none";
}

export function show(e) {
    e.style.display = "";
}

// A canvas the same size as canvas, for drawing off screen.
export function matchingCanvas(canvas) {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    return copy;
}

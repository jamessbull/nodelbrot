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

// Where a mouse event (or one from forwardTouchToMouse) is on canvas, as {offsetX, offsetY} in the
// canvas's own pixels, which differ from the page's when the page scales the canvas to fit.
export function canvasPosition(canvas, e) {
    return {
        offsetX: e.offsetX * (canvas.width / (canvas.clientWidth || canvas.width)),
        offsetY: e.offsetY * (canvas.height / (canvas.clientHeight || canvas.height))
    };
}

// A canvas the same size as canvas, for drawing off screen.
export function matchingCanvas(canvas) {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    return copy;
}

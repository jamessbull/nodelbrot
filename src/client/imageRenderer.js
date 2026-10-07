// Draws the renderer's image on canvas after each frame: imgData (the RGBA pixels of a width x height
// display, the same buffer every frame), or source, a canvas the renderer draws it on, if there is one
// (see gpuRenderer.js).
export function createImageRenderer({events, canvas, imgData, width, height, source}) {
    const context = canvas.getContext("2d");
    if (source) {
        events.listenTo(events.frameComplete, () => context.drawImage(source, 0, 0));
        return;
    }
    // Wraps the image buffer, so drawing it needs no copy.
    const imageData = new ImageData(imgData, width, height);
    events.listenTo(events.frameComplete, () => context.putImageData(imageData, 0, 0));
}

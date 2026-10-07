// Draws the renderer's image, imgData (the RGBA pixels of a width x height display, the same buffer
// every frame), on canvas after each frame.
export function createImageRenderer({events, canvas, imgData, width, height}) {
    const context = canvas.getContext("2d");
    // Wraps the image buffer, so drawing it needs no copy.
    const imageData = new ImageData(imgData, width, height);
    events.listenTo(events.frameComplete, () => context.putImageData(imageData, 0, 0));
}

// Draws the renderer's image on the canvas after each frame.
export function createImageRenderer(_events, _canvas, _width, _height) {
    const on = _events.listenTo;
    const context = _canvas.getContext('2d');
    let imageData;      // wraps the renderer's image buffer, so drawing it needs no copy
    let imageBuffer;

    // args.imgData is the whole image for the canvas (args.offset is always 0), and is the same
    // buffer every frame.
    on(_events.renderImage, function (args) {
        if (args.imgData !== imageBuffer) {
            imageBuffer = args.imgData;
            imageData = new ImageData(imageBuffer, _width, _height);
        }
    });

    on(_events.andFinally, function () {
        if (imageData) {
            context.putImageData(imageData, 0, 0);
        }
    });

    return {};
}

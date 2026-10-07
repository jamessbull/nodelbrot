// Draws a whole canvas a pixel at a time: drawXY(f) colours each pixel x, y with f(x, y), {r, g, b, a}.
export function createSimpleImage(canvas) {
    const context = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const noOfPixels = w * h;
    const output = context.createImageData(w, h);

    return {
        drawXY: function (f) {
            let col, x, y, i;
            for (i = 0; i < noOfPixels; i += 1) {
                x = i % w;
                y = Math.floor(i / w);
                col = f(x, y);
                output.data[i * 4]     = col.r;
                output.data[i * 4 + 1] = col.g;
                output.data[i * 4 + 2] = col.b;
                output.data[i * 4 + 3] = col.a;
            }
            context.putImageData(output, 0, 0);
        },
        canvas: canvas
    };
}

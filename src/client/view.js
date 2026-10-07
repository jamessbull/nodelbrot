import { rectangle } from "./geometry.js";
import { bitsFor, decimalPlacesFor, fromDecimal, fromNumber, rescale, toDecimal, toNumber } from "./fixed.js";

// A view: the point of the complex plane at the centre of the display, x + iy, held in fixed point (x and
// y are BigInts with bits binary places) so it can be placed more precisely than a double allows, and
// the size of a pixel, a double, as pixels are square. A view doesn't depend on the display's size: a
// bigger display shows more around the same centre, at the same zoom.
//
// Pixel (i, j) of a width x height display is at offset (i - (width - 1) / 2, j - (height - 1) / 2)
// pixels from the centre.
export function createView(x, y, bits, pixelSize) {
    if (!(pixelSize > 0) || !Number.isFinite(pixelSize)) {
        throw new RangeError("A view's pixels must have a size, not " + pixelSize);
    }
    return {
        x: x,
        y: y,
        bits: bits,
        pixelSize: pixelSize,
        // The rectangle of the complex plane a width x height display shows, in doubles: x and y of its
        // top left pixel, and its width and height from the first pixel to the last.
        area: function (width, height) {
            const halfWidth = ((width - 1) / 2) * pixelSize;
            const halfHeight = ((height - 1) / 2) * pixelSize;
            return rectangle(toNumber(x, bits) - halfWidth, toNumber(y, bits) - halfHeight, 2 * halfWidth, 2 * halfHeight);
        },
        // The centre, as doubles.
        centre: function () {
            return {x: toNumber(x, bits), y: toNumber(y, bits)};
        }
    };
}

// The view centred on (x, y), doubles or decimal strings, with pixels pixelSize across.
export function viewAt(x, y, pixelSize) {
    const bits = bitsFor(pixelSize);
    const read = (value) => typeof value === "number" ? fromNumber(value, bits) : fromDecimal(value, bits);
    return createView(read(x), read(y), bits, pixelSize);
}

// The view, centred on (x, y), that shows all of a w x h area of the complex plane on a width x height
// display, with more around it in whichever direction the display's shape needs.
export function viewShowing(x, y, w, h, width, height) {
    return viewAt(x, y, Math.max(w / (width - 1), h / (height - 1)));
}

// The view moved by (dx, dy) pixels, with pixels newPixelSize across (by default the same size): the point
// that was dx, dy pixels from the centre is the new centre.
export function shiftView(view, dx, dy, newPixelSize = view.pixelSize) {
    const bits = Math.max(view.bits, bitsFor(newPixelSize));
    const x = rescale(view.x, view.bits, bits) + fromNumber(dx * view.pixelSize, bits);
    const y = rescale(view.y, view.bits, bits) + fromNumber(dy * view.pixelSize, bits);
    // Fewer places are kept when zooming out, so the numbers don't grow without end.
    const keep = bitsFor(newPixelSize);
    return createView(rescale(x, bits, keep), rescale(y, bits, keep), keep, newPixelSize);
}

// The point of the complex plane dx, dy pixels from the view's centre, as decimals precise enough to
// tell it from the next pixel's.
export function pointAt(view, dx, dy) {
    const x = view.x + fromNumber(dx * view.pixelSize, view.bits);
    const y = view.y + fromNumber(dy * view.pixelSize, view.bits);
    const places = decimalPlacesFor(view.pixelSize);
    return {x: toDecimal(x, view.bits, places), y: toDecimal(y, view.bits, places)};
}

// The view's centre as decimals, precise enough to place it to a fraction of a pixel.
export function describeCentre(view) {
    return pointAt(view, 0, 0);
}

// Where the area other shows is, in pixels on a width x height display showing view, as a rectangle
// from the top left of the first pixel to the bottom right of the last.
export function areaOnScreen(other, view, width, height) {
    const bits = Math.max(view.bits, other.bits);
    const offset = (a, b) => toNumber(rescale(a, other.bits, bits) - rescale(b, view.bits, bits), bits) / view.pixelSize;
    const scale = other.pixelSize / view.pixelSize;
    const left = ((width - 1) / 2) + offset(other.x, view.x) - (((width - 1) / 2) * scale);
    const top = ((height - 1) / 2) + offset(other.y, view.y) - (((height - 1) / 2) * scale);
    return rectangle(left, top, width * scale, height * scale);
}

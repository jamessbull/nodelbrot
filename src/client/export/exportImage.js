import { colourPixels } from "../worker/pixelIterator.js";

// A finished export, width x height: each pixel's smoothed escape iteration in smooth (0 for those in the
// set, by the depth), and counts, the cumulative escapes by iteration (or bin: see histogramBins.js) of
// the whole image, total in all. It is coloured against those with colours (a palette lookup table) only
// as rows(from, to) asks for rows (from to to, not including to), as RGBA data, so the whole image never
// needs to be held coloured as well (see pngWriter.js). image() is all of it, for small ones.
export function exportImage({width, height, smooth, counts, total, colours}) {
    function rows(from, to) {
        const image = new Uint8ClampedArray((to - from) * width * 4);
        const part = smooth.subarray(from * width, to * width);
        colourPixels(image, part, part, counts, counts.length, total, colours);
        return image;
    }
    return {width, height, rows, image: () => rows(0, height)};
}

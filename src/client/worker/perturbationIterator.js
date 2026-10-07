import { colourPixels, countEscaped } from "./pixelIterator.js";

const histogramEscapeValue = 16;
const imageEscapeValue = 9007199254740991;

// A worker's copy of the reference orbit (see referenceOrbit.js), which arrives in chunks: values is
// x, y pairs of Z0, Z1, ..., length how many there are, and escaped whether the last one escaped, so
// the orbit is complete.
export function createOrbitStore() {
    const store = {
        generation: -1,
        values: new Float64Array(0),
        length: 0,
        escaped: false,
        // A new orbit, for generation.
        reset: function (generation) {
            store.generation = generation;
            store.length = 0;
            store.escaped = false;
        },
        // Values from index from on, for generation.
        add: function (generation, from, values, escaped) {
            if (generation !== store.generation) {
                store.reset(generation);
            }
            const end = (2 * from) + values.length;
            if (end > store.values.length) {
                const grown = new Float64Array(Math.max(end, 2 * store.values.length));
                grown.set(store.values.subarray(0, 2 * store.length));
                store.values = grown;
            }
            store.values.set(values, 2 * from);
            store.length = Math.max(store.length, end / 2);
            store.escaped = escaped;
        }
    };
    return store;
}

// Iterates and colours width x height pixels like createPixelIterator, for views too deep for doubles,
// by perturbation: each pixel's c is the reference orbit's point plus a small difference dc, and its
// orbit z is the reference orbit's Zm plus a small difference d, which is all that is iterated:
//
//     d(n+1) = 2 Zm d(n) + d(n)^2 + dc
//
// The differences are small enough for doubles to hold precisely however deep the view is. extents
// places pixels as createPixelIterator's do, but gives each pixel's dc rather than c. orbit is an orbit
// store, which must be long enough for the iterations asked for: at least start + count + 2 values,
// unless it has escaped.
//
// When z comes closer to 0 than d, or the reference orbit runs out (it escaped), the pixel carries on
// from the start of the reference orbit with d = z (rebasing). That keeps d small next to z, so
// pixels whose orbits part from the reference's are still right, with just one reference orbit.
//
// Escapes are counted and coloured exactly as createPixelIterator's are. Points in the set iterate to
// the depth asked for, as the checks for the main cardioid and for cycles assume c is known precisely.
//
// restartSurvivors(extents) starts the pixels still going again with the new extents, from the start of
// a new reference orbit, keeping those that have escaped (see rereference.js).
export function createPerturbationIterator(width, height, startExtents, orbit) {
    const log = Math.log;
    const LN2 = Math.LN2;
    const noOfPixels = width * height;
    let extents = startExtents;
    const firstRow = extents.firstRow;
    const rowStride = extents.rowStride;
    const dxs = new Float64Array(noOfPixels);
    const dys = new Float64Array(noOfPixels);
    const ms = new Uint32Array(noOfPixels);                  // where in the reference orbit each pixel is
    const escapeValues = new Uint32Array(noOfPixels);
    const imageEscapeValues = new Uint32Array(noOfPixels);
    const smoothIterations = new Float64Array(noOfPixels);

    function iterate(startIteration, noOfIterations, histogramUpdate) {
        const Z = orbit.values;
        // Rebase on reaching the last value only if the orbit has escaped: otherwise it is still being
        // worked out, and there is always more of it than is asked for.
        const end = orbit.escaped ? orbit.length - 1 : -1;
        let idx = 0;
        for (let j = 0; j < height; j += 1) {
            const dcy = extents.my + ((firstRow + (j * rowStride)) * extents.stepY);
            for (let i = 0; i < width; i += 1, idx += 1) {
                if (startIteration !== 0 && escapeValues[idx] === startIteration) {
                    histogramUpdate[0] += 1;
                }
                if (imageEscapeValues[idx] !== 0) continue;
                const dcx = extents.mx + (i * extents.stepX);
                let dx = dxs[idx];
                let dy = dys[idx];
                let m = ms[idx];
                let histogramEscapedAt = escapeValues[idx];
                let n = 0;
                while (n < noOfIterations) {
                    const Zx = Z[2 * m];
                    const Zy = Z[(2 * m) + 1];
                    const zx = Zx + dx;
                    const zy = Zy + dy;
                    const zSquared = (zx * zx) + (zy * zy);
                    n += 1;
                    if (zSquared < imageEscapeValue) {
                        const nextDx = (2 * ((Zx * dx) - (Zy * dy))) + ((dx * dx) - (dy * dy)) + dcx;
                        dy = (2 * ((Zx * dy) + (Zy * dx) + (dx * dy))) + dcy;
                        dx = nextDx;
                        m += 1;
                        const nextZx = Z[2 * m] + dx;
                        const nextZy = Z[(2 * m) + 1] + dy;
                        if ((nextZx * nextZx) + (nextZy * nextZy) < (dx * dx) + (dy * dy) || m === end) {
                            dx = nextZx;
                            dy = nextZy;
                            m = 0;
                        }
                    }
                    if (histogramEscapedAt === 0 && zSquared > histogramEscapeValue) {
                        histogramEscapedAt = startIteration + n;
                        if (n < noOfIterations) {
                            histogramUpdate[n] += 1;
                        }
                    }
                    if (zSquared > imageEscapeValue) {
                        imageEscapeValues[idx] = startIteration + n;
                        smoothIterations[idx] = startIteration + n + 1 - log(log(zSquared) / 2 / LN2) / LN2;
                        break;
                    }
                }
                dxs[idx] = dx;
                dys[idx] = dy;
                ms[idx] = m;
                escapeValues[idx] = histogramEscapedAt;
            }
        }
    }

    // Each pixel's z, as the examine panel shows it.
    function orbitPoints() {
        const xs = new Float64Array(noOfPixels);
        const ys = new Float64Array(noOfPixels);
        for (let idx = 0; idx < noOfPixels; idx += 1) {
            xs[idx] = orbit.values[2 * ms[idx]] + dxs[idx];
            ys[idx] = orbit.values[(2 * ms[idx]) + 1] + dys[idx];
        }
        return {xs, ys};
    }

    function restartSurvivors(newExtents) {
        extents = newExtents;
        for (let idx = 0; idx < noOfPixels; idx += 1) {
            if (imageEscapeValues[idx] === 0) {
                dxs[idx] = 0;
                dys[idx] = 0;
                ms[idx] = 0;
            }
        }
    }

    return {
        iterate: iterate,
        restartSurvivors: restartSurvivors,
        colour: (imageData, histogramData, histogramLength, histogramTotal, colours) =>
            colourPixels(imageData, smoothIterations, imageEscapeValues, histogramData, histogramLength, histogramTotal, colours),
        escapedCount: () => countEscaped(escapeValues),
        get xState() { return orbitPoints().xs; },
        get yState() { return orbitPoints().ys; },
        escapeValues: escapeValues,
        imageEscapeValues: imageEscapeValues
    };
}

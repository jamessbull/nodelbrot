import { colourPixels, countEscaped } from "./pixelIterator.js";
import { blaFor, minLevel } from "./bla.js";

const histogramEscapeValue = 16;
const imageEscapeValue = 9007199254740991;

// Cycles are looked for every this many iterations (a power of two), not every one, which costs less: a
// state that comes round again comes round at the iterations looked at too, a little later.
const cycleCheckEvery = 8;

// A worker's copy of the reference orbit (see referenceOrbit.js), which arrives in chunks: values is
// x, y pairs of Z0, Z1, ..., length how many there are, and complete whether that's all of it (the last
// escaped, or is the end of a nucleus's period, or the same as the one at loopTo, otherwise -1).
export function createOrbitStore() {
    const store = {
        generation: -1,
        values: new Float64Array(0),
        length: 0,
        complete: false,
        loopTo: -1,
        // A new orbit, for generation.
        reset: function (generation) {
            store.generation = generation;
            store.length = 0;
            store.complete = false;
            store.loopTo = -1;
            store.runShare = undefined;
        },
        // Values from index from on, for generation.
        add: function (generation, from, values, complete, loopTo = -1) {
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
            store.complete = complete;
            store.loopTo = loopTo;
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
// When z comes closer to 0 than d, or the reference orbit runs out (it escaped, or a nucleus's period
// is over), the pixel carries on from the start of the reference orbit with d = z (rebasing). An orbit
// that loops has no end: there, pixels carry on from orbit.loopTo with d as it is, as Z is the same. That keeps
// d small next to z, so pixels whose orbits part from the reference's are still right, with just one
// reference orbit.
//
// Escapes are counted and coloured exactly as createPixelIterator's are. Its check for the main
// cardioid needs c to be known precisely, which it isn't here, but its check for cycles works as well on
// a pixel's state here, where it is in the reference orbit and d: if that comes round to exactly what it
// was, the iteration as computed repeats for ever, so the pixel never escapes, and is left (unless
// options say cycles: false). Pixels in the set are drawn into a cycle, and once they are as near it as
// rounding allows, they repeat exactly.
//
// While d is small enough, runs of iterations are taken in one step, by bivariate linear approximation
// (see bla.js), unless options say bla: false. No pixel escapes during one, as z is next to Z there.
//
// restartSurvivors(extents) starts the pixels still going again with the new extents, from the start of
// a new reference orbit, keeping those that have escaped (see rereference.js).
export function createPerturbationIterator(width, height, startExtents, orbit, {cycles = true, bla = true} = {}) {
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
    // Checking for cycles (Brent's method, as in createPixelIterator): each pixel keeps a state from its
    // orbit, replaced after periodWindow iterations, the window doubling each time.
    const neverEscapes = new Uint8Array(noOfPixels);
    const periodMs = new Uint32Array(noOfPixels);
    const periodDxs = new Float64Array(noOfPixels);
    const periodDys = new Float64Array(noOfPixels);
    const periodWindows = new Uint32Array(noOfPixels).fill(1);
    const periodCounts = new Uint32Array(noOfPixels);

    // The furthest any pixel is from the reference orbit's point.
    function dcMax() {
        const xs = [extents.mx, extents.mx + ((width - 1) * extents.stepX)];
        const ys = [firstRow, firstRow + ((height - 1) * rowStride)].map((row) => extents.my + (row * extents.stepY));
        return Math.hypot(Math.max(...xs.map(Math.abs)), Math.max(...ys.map(Math.abs)));
    }

    // Advances each pixel noOfIterations iterations from startIteration. Runs are only looked for while
    // they have been taking a fair share of the iterations (in an iteration or more of the orbit, from
    // any iterator) and again every so often, as the loop that looks for them is slower than one that
    // doesn't, even where none is taken. Each loop is written out in full, for the same reason.
    function iterate(startIteration, noOfIterations, histogramUpdate) {
        const share = orbit.runShare;
        orbit.runCalls = (orbit.runCalls || 0) + 1;
        if (bla && (share === undefined || share >= 0.1 || orbit.runCalls % 32 === 0)) {
            orbit.runShare = stepsWithRuns(startIteration, noOfIterations, histogramUpdate, blaFor(orbit, dcMax()).levels);
        } else {
            stepsPlain(startIteration, noOfIterations, histogramUpdate);
        }
    }

    function stepsPlain(startIteration, noOfIterations, histogramUpdate) {
        const Z = orbit.values;
        // Rebase on reaching the last value only if the orbit is complete: otherwise it is still being
        // worked out, and there is always more of it than is asked for.
        const end = orbit.complete ? orbit.length - 1 : -1;
        const loopTo = orbit.loopTo;
        let idx = 0;
        for (let j = 0; j < height; j += 1) {
            const dcy = extents.my + ((firstRow + (j * rowStride)) * extents.stepY);
            for (let i = 0; i < width; i += 1, idx += 1) {
                if (startIteration !== 0 && escapeValues[idx] === startIteration) {
                    histogramUpdate[0] += 1;
                }
                if (imageEscapeValues[idx] !== 0 || neverEscapes[idx] !== 0) continue;
                const dcx = extents.mx + (i * extents.stepX);
                let dx = dxs[idx];
                let dy = dys[idx];
                let m = ms[idx];
                let histogramEscapedAt = escapeValues[idx];
                // No state can match this until the first is kept, if cycles aren't being looked for.
                let refM = cycles ? periodMs[idx] : -1;
                let refDx = periodDxs[idx];
                let refDy = periodDys[idx];
                let window = cycles ? periodWindows[idx] : 0;
                let sinceRef = periodCounts[idx];
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
                        const closer = (nextZx * nextZx) + (nextZy * nextZy) < (dx * dx) + (dy * dy);
                        if (closer || m === end) {
                            if (!closer && loopTo >= 0) {
                                m = loopTo;
                            } else {
                                dx = nextZx;
                                dy = nextZy;
                                m = 0;
                            }
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
                    // Every eighth iteration (see cycleCheckEvery).
                    if ((n & (cycleCheckEvery - 1)) === 0) {
                        if (m === refM && dx === refDx && dy === refDy) {
                            neverEscapes[idx] = 1;
                            break;
                        }
                        sinceRef += 1;
                        if (sinceRef === window) {
                            sinceRef = 0;
                            window *= 2;
                            refM = m;
                            refDx = dx;
                            refDy = dy;
                        }
                    }
                }
                dxs[idx] = dx;
                dys[idx] = dy;
                ms[idx] = m;
                escapeValues[idx] = histogramEscapedAt;
                periodMs[idx] = refM;
                periodDxs[idx] = refDx;
                periodDys[idx] = refDy;
                periodWindows[idx] = window;
                periodCounts[idx] = sinceRef;
            }
        }
    }

    function stepsWithRuns(startIteration, noOfIterations, histogramUpdate, levels) {
        const Z = orbit.values;
        // Rebase on reaching the last value only if the orbit is complete: otherwise it is still being
        // worked out, and there is always more of it than is asked for.
        const end = orbit.complete ? orbit.length - 1 : -1;
        const loopTo = orbit.loopTo;
        const shortestRun = 2 ** minLevel;
        // No run can be taken with d at least this, squared: a quick test first.
        let mostR = 0;
        for (let at = 4; at < levels[0].length; at += 5) {
            mostR = Math.max(mostR, levels[0][at]);
        }
        const mostRSquared = mostR * mostR;
        let skipped = 0;
        let stepped = 0;
        let idx = 0;
        for (let j = 0; j < height; j += 1) {
            const dcy = extents.my + ((firstRow + (j * rowStride)) * extents.stepY);
            for (let i = 0; i < width; i += 1, idx += 1) {
                if (startIteration !== 0 && escapeValues[idx] === startIteration) {
                    histogramUpdate[0] += 1;
                }
                if (imageEscapeValues[idx] !== 0 || neverEscapes[idx] !== 0) continue;
                const dcx = extents.mx + (i * extents.stepX);
                let dx = dxs[idx];
                let dy = dys[idx];
                let m = ms[idx];
                let histogramEscapedAt = escapeValues[idx];
                // No state can match this until the first is kept, if cycles aren't being looked for.
                let refM = cycles ? periodMs[idx] : -1;
                let refDx = periodDxs[idx];
                let refDy = periodDys[idx];
                let window = cycles ? periodWindows[idx] : 0;
                let sinceRef = periodCounts[idx];
                let n = 0;
                while (n < noOfIterations) {
                    // The longest run that starts here (one past a multiple of the shortest), fits in what's
                    // left, and d is small enough for. A run's R is no more than that of the first half of it,
                    // a level down, so if the shortest run won't do, none will.
                    if (m > 0 && ((m - 1) & (shortestRun - 1)) === 0 && (dx * dx) + (dy * dy) < mostRSquared && shortestRun <= noOfIterations - n) {
                        const from = m - 1;
                        const dSquared = (dx * dx) + (dy * dy);
                        let at = 5 * (from / shortestRun);
                        if (at < levels[0].length && dSquared < levels[0][at + 4] * levels[0][at + 4]) {
                            let level = 0;
                            for (;;) {
                                const up = level + 1;
                                const run = shortestRun << up;
                                if (up >= levels.length || from % run !== 0 || run > noOfIterations - n) break;
                                const upAt = 5 * (from / run);
                                const upTable = levels[up];
                                if (upAt >= upTable.length || dSquared >= upTable[upAt + 4] * upTable[upAt + 4]) break;
                                level = up;
                                at = upAt;
                            }
                            const table = levels[level];
                            const ax = table[at], ay = table[at + 1], bx = table[at + 2], by = table[at + 3];
                            const nextDx = (ax * dx) - (ay * dy) + (bx * dcx) - (by * dcy);
                            dy = (ax * dy) + (ay * dx) + (bx * dcy) + (by * dcx);
                            dx = nextDx;
                            m += shortestRun << level;
                            n += shortestRun << level;
                            skipped += shortestRun << level;
                            if (m === end && loopTo >= 0) {
                                m = loopTo;
                            } else if (m === end) {
                                dx += Z[2 * m];
                                dy += Z[(2 * m) + 1];
                                m = 0;
                            }
                            continue;
                        }
                    }
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
                        const closer = (nextZx * nextZx) + (nextZy * nextZy) < (dx * dx) + (dy * dy);
                        if (closer || m === end) {
                            if (!closer && loopTo >= 0) {
                                m = loopTo;
                            } else {
                                dx = nextZx;
                                dy = nextZy;
                                m = 0;
                            }
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
                    // Every eighth iteration (see cycleCheckEvery).
                    if ((n & (cycleCheckEvery - 1)) === 0) {
                        if (m === refM && dx === refDx && dy === refDy) {
                            neverEscapes[idx] = 1;
                            break;
                        }
                        sinceRef += 1;
                        if (sinceRef === window) {
                            sinceRef = 0;
                            window *= 2;
                            refM = m;
                            refDx = dx;
                            refDy = dy;
                        }
                    }
                }
                stepped += n;
                dxs[idx] = dx;
                dys[idx] = dy;
                ms[idx] = m;
                escapeValues[idx] = histogramEscapedAt;
                periodMs[idx] = refM;
                periodDxs[idx] = refDx;
                periodDys[idx] = refDy;
                periodWindows[idx] = window;
                periodCounts[idx] = sinceRef;
            }
        }
        return stepped === 0 ? 0 : skipped / stepped;
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
            if (imageEscapeValues[idx] === 0 && neverEscapes[idx] === 0) {
                dxs[idx] = 0;
                dys[idx] = 0;
                ms[idx] = 0;
                periodMs[idx] = 0;
                periodDxs[idx] = 0;
                periodDys[idx] = 0;
                periodWindows[idx] = 1;
                periodCounts[idx] = 0;
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
        imageEscapeValues: imageEscapeValues,
        smoothIterations: smoothIterations
    };
}

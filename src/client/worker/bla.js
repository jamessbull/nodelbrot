// Bivariate linear approximation (BLA): skipping many perturbation iterations at once. While a pixel's d
// is small next to the reference orbit's Z, d^2 is negligible in
//
//     d(n+1) = 2 Zm d(n) + d(n)^2 + dc
//
// and l iterations from m are, as near as makes no difference, linear in d and dc:
//
//     d(n+l) = A d(n) + B dc
//
// where one iteration has A = 2 Zm, B = 1, and two runs x then y combine as A = Ay Ax, B = Ay Bx + By.
// Each run is good while |d| < R: one iteration while |d| < epsilon |Zm| (so d^2 is at most epsilon of
// 2 Zm d), and a combined run while it is for x, and for y after x, as far as can be told without
// knowing d or dc beyond |dc| <= dcMax.
//
// The table has levels of runs of 2^k iterations, for k from minLevel up, each starting at m = 1 + j 2^k
// (m = 0, where Z is 0, is a step of its own). Shorter runs aren't kept, as they save little and would
// take a lot of memory: pixels take ordinary iterations until they reach the start of a run.
export const minLevel = 4;
export const epsilon = 2 ** -53;

// The table for the orbit values (x, y pairs) of length values, for pixels up to dcMax from its point,
// for doubles (or with tolerance in place of epsilon, for less precise numbers).
// Runs go no further than the last value, so pixels are at a value the orbit has when they come out.
export function buildBla(values, length, dcMax, tolerance = epsilon) {
    const levels = [];
    // Runs of 2^minLevel, made by folding single iterations in.
    const runLength = 2 ** minLevel;
    const count = Math.floor((length - 2) / runLength);
    let current = new Float64Array(5 * Math.max(0, count));
    for (let j = 0; j < count; j += 1) {
        const start = 1 + (j * runLength);
        let ax = 1, ay = 0, bx = 0, by = 0, r = Infinity;
        for (let m = start; m < start + runLength; m += 1) {
            const zx = values[2 * m];
            const zy = values[(2 * m) + 1];
            // This iteration: A = 2Z, B = 1, R = epsilon |Z|; then combined with the run so far.
            const stepR = tolerance * Math.hypot(zx, zy);
            const aSize = Math.hypot(ax, ay);
            r = Math.min(r, Math.max(0, (stepR - (Math.hypot(bx, by) * dcMax)) / aSize));
            const nextAx = 2 * ((zx * ax) - (zy * ay));
            ay = 2 * ((zx * ay) + (zy * ax));
            ax = nextAx;
            const nextBx = (2 * ((zx * bx) - (zy * by))) + 1;
            by = 2 * ((zx * by) + (zy * bx));
            bx = nextBx;
        }
        current.set([ax, ay, bx, by, Number.isFinite(r) ? r : 0], 5 * j);
    }
    levels.push(current);
    // Each level up joins pairs of runs from the one below.
    while (current.length >= 10) {
        const pairs = Math.floor(current.length / 10);
        const next = new Float64Array(5 * pairs);
        for (let j = 0; j < pairs; j += 1) {
            const x = 10 * j;
            const y = x + 5;
            const axx = current[x], axy = current[x + 1], bxx = current[x + 2], bxy = current[x + 3], rx = current[x + 4];
            const ayx = current[y], ayy = current[y + 1], byx = current[y + 2], byy = current[y + 3], ry = current[y + 4];
            next[5 * j] = (ayx * axx) - (ayy * axy);
            next[(5 * j) + 1] = (ayx * axy) + (ayy * axx);
            next[(5 * j) + 2] = (ayx * bxx) - (ayy * bxy) + byx;
            next[(5 * j) + 3] = (ayx * bxy) + (ayy * bxx) + byy;
            const r = Math.min(rx, Math.max(0, (ry - (Math.hypot(bxx, bxy) * dcMax)) / Math.hypot(axx, axy)));
            next[(5 * j) + 4] = Number.isFinite(r) ? r : 0;
        }
        levels.push(next);
        current = next;
    }
    return {levels, length};
}

// The orbit store's table for pixels up to dcMax from the orbit's point, made when first wanted and
// again when the orbit has doubled in length (until then, the one there is covers the start of it).
export function blaFor(store, dcMax) {
    // Tables are kept for dcMax to the next power of two, so a few serve every part of an image.
    const key = 2 ** Math.ceil(Math.log2(Math.max(dcMax, Number.MIN_VALUE)));
    if (!store.bla || store.bla.generation !== store.generation) {
        store.bla = {generation: store.generation, tables: new Map()};
    }
    const kept = store.bla.tables.get(key);
    if (kept && (kept.length === store.length || (!store.complete && store.length < 2 * kept.length))) {
        return kept;
    }
    const table = buildBla(store.values, store.length, key);
    store.bla.tables.set(key, table);
    return table;
}

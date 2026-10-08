// Escape histograms count escapes by iteration up to exactBins, and past there in bins of binWidth
// iterations, so that one for hundreds of millions of iterations still fits in memory, and in a GPU
// texture (see gpu/shaders.js, which does the same). Nobody can see the difference: by then each bin is
// a tiny share of the iterations.
export const exactBins = 2 ** 23;
const binShift = 4;
export const binWidth = 2 ** binShift;

// The bin an iteration's escapes are counted in.
export function binOf(iteration) {
    return iteration < exactBins ? iteration : exactBins + ((iteration - exactBins) >>> binShift);
}

// Where a smoothed iteration (with a fraction) falls among the bins, with a fraction of a bin.
export function binPosition(iteration) {
    return iteration < exactBins ? iteration : exactBins + ((iteration - exactBins) / binWidth);
}

// How many bins it takes for iterations up to and including depth.
export function binsFor(depth) {
    return binOf(depth) + 1;
}

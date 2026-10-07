// How deep the explorer can go.
//
// Iterating in doubles, which hold about 16 significant digits, rounding grows along each orbit, and
// measured against exact calculation escape counts start coming out visibly wrong (more than 2% out) for
// one pixel in eight once pixels are about 1e-14 across. The orbit, not the point c, sets this: it
// spends its time about 1 to 2 from the origin wherever c is, so it is the pixel size that matters,
// against |c| only where that is bigger. Past perturbationLimit, views are rendered by perturbation
// instead (see perturbationIterator.js), which iterates only small differences, precise at any depth.
export const perturbationLimit = 5e-14;

export function needsPerturbation(view) {
    const centre = view.centre();
    return view.pixelSize < perturbationLimit * Math.max(1, Math.abs(centre.x), Math.abs(centre.y));
}

// Perturbation holds pixels' differences as doubles too, which can't be much smaller than 1e-308, so
// zooming stops when pixels are this small.
export const smallestPixel = 1e-300;

// At the smallest pixel, badge shows, and notice says so when it is reached.
export function depthWarning({events, notice, badge}) {
    let deepest = false;
    events.listenTo(events.viewChanged, function (view) {
        const wasDeepest = deepest;
        deepest = view.pixelSize <= smallestPixel;
        badge.hidden = !deepest;
        if (deepest && !wasDeepest) {
            notice.show("This is as far in as the explorer can go.");
        }
    });
}

// Coordinates are doubles, which hold about 16 significant digits. Measured in the browser, the image
// turns blocky once neighbouring pixels are less than one step of that precision apart (1e-16 of the
// coordinates' size). This warns at about 5 steps, a few zooms before that.
export const precisionLimit = 1e-15;

// Whether a view (see view.js) is near that limit: whether its pixels are that small next to the size of
// the coordinates around them.
export function isNearLimit(view) {
    const centre = view.centre();
    const magnitude = Math.max(Math.abs(centre.x), Math.abs(centre.y), 1e-300);
    return view.pixelSize / magnitude < precisionLimit;
}

// Says so, once, each time the view goes past the limit.
export function precisionWarning(events, notice) {
    let nearLimit = false;
    events.listenTo(events.viewChanged, function (view) {
        const wasNearLimit = nearLimit;
        nearLimit = isNearLimit(view);
        if (nearLimit && !wasNearLimit) {
            notice.show("This is about as far in as the numbers can go: deeper will look blocky.");
        }
    });
}

// Coordinates are doubles, which hold about 16 significant digits. Measured in the browser, the image
// turns blocky once neighbouring pixels are less than one step of that precision apart (1e-16 of the
// coordinates' size). This warns at about 5 steps, a few zooms before that.
export const precisionLimit = 1e-15;

// Whether a view (a rectangle in the complex plane) shown pixelsAcross wide is near that limit.
export function isNearLimit(extents, pixelsAcross) {
    const x = extents.topLeft().x, y = extents.topLeft().y;
    const magnitude = Math.max(Math.abs(x), Math.abs(x + extents.width()), Math.abs(y), Math.abs(y + extents.height()), 1e-300);
    const pixelSize = extents.width() / (pixelsAcross - 1);
    return pixelSize / magnitude < precisionLimit;
}

// Says so, once, each time the view goes past the limit.
export function precisionWarning(events, notice, pixelsAcross) {
    let nearLimit = false;
    events.listenTo(events.viewChanged, function (extents) {
        const wasNearLimit = nearLimit;
        nearLimit = isNearLimit(extents, pixelsAcross);
        if (nearLimit && !wasNearLimit) {
            notice.show("This is about as far in as the numbers can go: deeper will look blocky.");
        }
    });
}

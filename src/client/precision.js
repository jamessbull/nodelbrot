// The renderer works in doubles, which hold about 16 significant digits. Rounding in the iteration grows
// along each orbit, and measured against exact calculation, escape counts start coming out visibly wrong
// (more than 2% out) for one pixel in eight once pixels are about 1e-14 across, and around one in four
// by 3e-15, looking like banding and noise. The orbit, not the point c, sets this: it spends its time
// about 1 to 2 from the origin wherever c is, so it is the pixel size that matters, against |c| only
// where that is bigger. This warns just before errors start to show.
export const precisionLimit = 5e-14;

// Whether a view (see view.js) is past that limit.
export function isNearLimit(view) {
    const centre = view.centre();
    return view.pixelSize < precisionLimit * Math.max(1, Math.abs(centre.x), Math.abs(centre.y));
}

// While the view is past the limit, badge shows, and notice says so once each time it goes past.
export function precisionWarning({events, notice, badge}) {
    let nearLimit = false;
    events.listenTo(events.viewChanged, function (view) {
        const wasNearLimit = nearLimit;
        nearLimit = isNearLimit(view);
        badge.hidden = !nearLimit;
        if (nearLimit && !wasNearLimit) {
            notice.show("This is about as far in as the numbers can go: deeper will show banding and noise.");
        }
    });
}

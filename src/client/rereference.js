// When to start a deep view again from another reference orbit, for both renderers.
//
// Pixels that outlast a reference orbit that escapes carry on from its start (rebasing), and checked
// against exact calculation they come out right. But pixels in the set, which never escape, would have to
// rebase again and again, and deep enough the difference between their c and the reference's is lost to
// rounding when they do. So if pixels are still going long after the reference escaped (twice as long,
// and at least 1000 iterations more), they are taken to be in the set, and rendering starts again from
// the orbit of the one nearest the centre, which won't escape. Not once rendering has stopped, though, as
// that would leave the image blank: it waits for rendering to go on. The image up to then was right, so
// it stays up (frameComplete isn't fired) until rendering has caught up with the depth it had reached.
export const maxRereferences = 5;

export function rereferenceDue(referenceOrbit, depth) {
    const escapedAt = referenceOrbit && referenceOrbit.escaped() ? referenceOrbit.length() - 1 : Infinity;
    return depth >= Math.max(2 * escapedAt, escapedAt + 1000);
}

// The pixel yet to escape nearest the centre of a width x height display, as {dx, dy} pixels from the
// centre, or null if they all have.
export function nearestUnescaped(escapeValues, width, height) {
    let nearest = null;
    let nearestDistance = Infinity;
    const middleX = (width - 1) / 2;
    const middleY = (height - 1) / 2;
    for (let idx = 0; idx < escapeValues.length; idx += 1) {
        if (escapeValues[idx] === 0) {
            const dx = (idx % width) - middleX;
            const dy = Math.floor(idx / width) - middleY;
            const distance = (dx * dx) + (dy * dy);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = {dx, dy};
            }
        }
    }
    return nearest;
}

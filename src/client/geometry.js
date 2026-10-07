export function coord(x, y) {
    return {
        x: x,
        y: y,
        distanceTo: function (c) {
            return coord(c.x - this.x, c.y - this.y);
        }
    };
}

// The point fromPoint in fromRect, at the same relative position in toRect.
function translator(fromRect, fromPoint) {
    return {
        translateTo: function (toRect) {
            return coord(
                toRect.topLeft().x + (((fromPoint.x - fromRect.topLeft().x) * toRect.width()) / fromRect.width()),
                toRect.topLeft().y + (((fromPoint.y - fromRect.topLeft().y) * toRect.height()) / fromRect.height())
            );
        }
    };
}

// A rectangle, made from x, y, width, height; from {x, y, w, h}; or from a top left coord and a coord
// holding its width and height.
export function rectangle(one, two, width, height) {
    let x, y, w, h;
    const present = (value) => value !== undefined;
    if (present(one.w)) {
        ({ x, y, w, h } = one);
    } else if (present(one.x)) {
        x = one.x;
        y = one.y;
        w = two.x;
        h = two.y;
    } else {
        x = one;
        y = two;
        w = width;
        h = height;
    }

    // Only the position and size are stored; x, y and the corners are worked out from them each time,
    // so they stay right after the rectangle is moved, placed or resized.
    return {
        get x() {
            return x;
        },
        get y() {
            return y;
        },
        topLeft: () => coord(x, y),
        topRight: () => coord(x + w, y),
        bottomRight: () => coord(x + w, y + h),
        bottomLeft: () => coord(x, y + h),
        width: function (val) {
            if (present(val)) {
                w = val;
            }
            return w;
        },
        height: function (val) {
            if (present(val)) {
                h = val;
            }
            return h;
        },
        difference: (other) => rectangle(x - other.x, y - other.y, w - other.width(), h - other.height()),
        resize: function (newWidth, newHeight) {
            this.width(newWidth);
            this.height(newHeight);
        },
        at: function (atX, atY) {
            return translator(this, present(atX.x) ? atX : coord(atX, atY));
        },
        copy: () => rectangle(x, y, w, h),
        place: function (newX, newY) {
            x = newX;
            y = newY;
        },
        move: function (byX, byY) {
            x += byX;
            y += byY;
        },
        translateFrom: function (source) {
            const selection = this;
            return {
                to: function (destination) {
                    const topLeft = source.at(selection.topLeft()).translateTo(destination);
                    const bottomRight = source.at(selection.bottomRight()).translateTo(destination);
                    return rectangle(topLeft, topLeft.distanceTo(bottomRight));
                }
            };
        }
    };
}

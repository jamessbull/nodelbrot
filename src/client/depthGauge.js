// A gauge of how deep rendering has gone, for when a new view is slow to appear: a line down the side of
// the image, with a marker ("You are here") at the depth the view before had reached when it was left,
// as a guide to how deep the new one will need to go, and another coming down to meet it as rendering
// goes deeper. It shows once a zoom or move has been rendering for a moment (delay ms) without getting
// that deep, and goes once it has (after linger ms), or rendering stops.
export function createDepthGauge({events, element, delay = 400, linger = 1500}) {
    const on = events.listenTo;
    element.innerHTML = "<div class=\"depthTrack\"></div>" +
        "<div class=\"depthMark depthTarget\"><span class=\"depthLabel\"></span></div>" +
        "<div class=\"depthMark depthCurrent\"><span class=\"depthLabel\"></span></div>";
    const [targetMark, currentMark] = element.querySelectorAll(".depthMark");
    let depth = 0;
    let previousDepth = 0;      // what the view before this one reached
    let target = 0;
    let active = false;
    let showTimer;
    let hideTimer;

    function draw() {
        const layout = gaugeLayout(depth, target);
        targetMark.style.top = (100 * layout.target) + "%";
        currentMark.style.top = (100 * layout.current) + "%";
        targetMark.firstChild.textContent = "You are here · " + shortDepth(target);
        currentMark.firstChild.textContent = shortDepth(depth);
    }

    function hide(after) {
        active = false;
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => element.classList.remove("shown"), after);
    }

    // The user moved the view: the depth to get back to is the most the views since the gauge last went
    // had reached.
    function moved() {
        target = Math.max(active ? target : 0, previousDepth);
        if (target === 0) {
            return;
        }
        active = true;
        clearTimeout(hideTimer);
        clearTimeout(showTimer);
        draw();
        showTimer = setTimeout(function () {
            if (active && depth < target) {
                element.classList.add("shown");
            }
        }, delay);
    }

    on(events.viewChanged, function () {
        previousDepth = Math.max(previousDepth, depth);
        depth = 0;
        if (active) draw();
    });
    [events.zoomToSelection, events.zoomOut, events.moveBy, events.transformView].forEach((event) => on(event, function () {
        moved();
        previousDepth = 0;
    }));
    on(events.depthReached, function (reached) {
        depth = reached;
        previousDepth = 0;
        if (active) {
            draw();
            if (depth >= target) {
                hide(linger);
            }
        }
    });
    on(events.stop, () => hide(0));
}

// Where the markers go, as fractions of the way down the line: depths on a log scale, the line going a
// little past the deeper of the two.
export function gaugeLayout(depth, target) {
    const bottom = Math.log(1 + (1.3 * Math.max(depth, target, 1)));
    return {current: Math.log(1 + depth) / bottom, target: Math.log(1 + target) / bottom};
}

// A depth in a few characters: 950, 12.5k, 340k, 2.1M.
export function shortDepth(n) {
    if (n < 10000) return String(n);
    if (n < 100000) return (n / 1000).toFixed(1) + "k";
    if (n < 999500) return Math.round(n / 1000) + "k";
    return (n / 1000000).toFixed(1) + "M";
}

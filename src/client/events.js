// The events the parts of the explorer use to tell each other what has happened, and what each one
// carries. Each event's name is its key.
const names = {
    // The view (the rectangle of the complex plane shown) has changed, to the rectangle given.
    viewChanged: "",
    // Rendering: start (carry on), stop, and restart after a zoom, move or new view.
    start: "",
    stop: "",
    restart: "",
    // Render one more frame, even if stopped, so a change such as to the colours shows.
    showChanges: "",
    // The palette has changed; carries the palette.
    paletteChanged: "",
    // A frame is done: depthReached (carrying its depth) then frameComplete.
    depthReached: "",
    frameComplete: "",
    // More of the reference orbit for the view has been worked out: {generation, from, values, length,
    // escaped}, values being the new x, y pairs from index from on.
    referenceOrbitGrew: "",
    // The reference orbit has started again from another point, {generation, offsetX, offsetY} pixels
    // from the view's centre, so rendering must start again too.
    referenceChanged: "",
    // A frame's escape counts from the workers: {update, currentIteration}.
    escapesFromWorkers: "",
    // The escape histogram has taken those in: {array, filledLength, total, currentIteration}.
    histogramChanged: "",
    // How many pixels have escaped in all, so far.
    escapedTotal: "",
    framesPerSecond: "",
    // Examining pixels: startExamining and stopExamining as the mode changes, pixelDataReady once a
    // frame has fetched the pixel data, and examinePixelAt {x, y} for a click or tap on the image.
    startExamining: "",
    stopExamining: "",
    pixelDataReady: "",
    examinePixelAt: "",
    // The pointer, in pixels on the image {x, y}: moving, and the left button pressed.
    pointerMoved: "",
    leftButtonDown: "",
    // Dragging out an area to zoom into, {x, y} each.
    selectionStart: "",
    selectionMove: "",
    selectionEnd: "",
    // Dragging the image along (with the right button), {x, y} each.
    dragStart: "",
    dragMove: "",
    dragEnd: "",
    // Changes to the view, asked for by the user: to the selection given, back out, by {x, y} pixels,
    // or by a pinch or drag {scale, translateX, translateY}.
    zoomToSelection: "",
    zoomOut: "",
    moveBy: "",
    transformView: ""
};
for (const key of Object.keys(names)) {
    names[key] = key;
}

// The explorer's events. listenTo adds a listener for an event, and fire calls an event's listeners with
// arg. Each explorer has its own. scope() gives the same events, but remembers the listeners added
// through it, so dispose() can remove them all, for parts of the explorer that get replaced.
export function createEvents() {
    const logEvents = false;
    let listeners = {};

    function listenTo(event, action) {
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push(action);
    }

    // Makes a new list rather than changing the old one, in case the event is being fired.
    function stopListening(event, action) {
        if (listeners[event]) {
            listeners[event] = listeners[event].filter((a) => a !== action);
        }
    }

    function fire(event, arg) {
        if (listeners[event]) {
            if (logEvents) {
                console.log(event);
            }
            // A listener that fails is logged and skipped, so the others still hear the event (one
            // failing during a frame would otherwise stop the rendering).
            listeners[event].forEach(function (action) {
                try {
                    action(arg);
                } catch (e) {
                    console.error("Error handling " + event + ":", e);
                }
            });
        }
    }

    function scope() {
        let added = [];
        return {
            ...names,
            fire: fire,
            listenTo: function (event, action) {
                listenTo(event, action);
                added.push([event, action]);
            },
            dispose: function () {
                added.forEach(([event, action]) => stopListening(event, action));
                added = [];
            }
        };
    }

    return {
        ...names,
        listenTo: listenTo,
        fire: fire,
        scope: scope,
        clear: function () {
            listeners = {};
        }
    };
}

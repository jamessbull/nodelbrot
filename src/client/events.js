// The names of the events the parts of the explorer use to talk to each other.
const names = {
    extentsUpdate: "extentsUpdate",
    start : "start",
    stop : "stop",
    restart: "restart",
    nodeAdded: "nodeAdded",
    pulseUI:"pulseUI",
    morePixelsEscaped: "morePixelsEscaped",
    paletteChanged: "paletteUpdate",
    colourSelected: "colourSelected",
    maxIterationsUpdated: "maxIterationsUpdated",
    frameComplete: "frameComplete",
    andFinally: "andFinally",
    histogramUpdateReceivedFromWorker: "histogramUpdateReceivedFromWorker",
    histogramUpdated: "histogramUpdated",
    renderImage:"renderImage",
    currentFramesPerSecond: "currentFramesPerSecond",
    examinePixelState: "examinePixelState",
    publishPixelState: "publishPixelState",
    stopExaminingPixelState: "stopExaminingPixelState",
    mouseMoved: "mouseMoved",
    selectionChanged: "selectionChanged",
    leftMouseDown: "leftMouseDown",
    zoomOutAction: "zoomOut",
    beginSelectionAction: "beginSelectionAction",
    beginMoveAction: "beginMoveAction",
    endMoveAction: "endMoveAction",
    endSelectionAction: "endSelectionAction",
    zoomInAction: "zoomInAction",
    viewMoveAction: "viewMoveAction",
    moveSetAction: "moveSetAction",
    examinePixelAction: "examinePixelAction"
};

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

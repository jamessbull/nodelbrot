namespace("jim.events");
jim.events.create = function () {
    "use strict";
    var logEvents = false;
    var listeners = {};
    return {
        listenTo: function (event, action) {
            if(!listeners[event]) {
                listeners[event] = [];
            }
            listeners[event].push(action);
        },
        fire: function (event, arg) {
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
        },
        clear:function () {
            listeners = {};
        },
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
        examinePixelAction:    "examinePixelAction"
    };
};

var events = jim.events.create();
var on = events.listenTo;
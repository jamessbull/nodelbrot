namespace("jim.events");
jim.events.create = function () {
    "use strict";
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
                listeners[event].forEach(function (action) { action(arg); });
            }
        },
        clear:function () {
            listeners = {};
        },
        extentsUpdate: "extentsUpdate",
        paletteChanged: "paletteUpdate",
        maxIterationsUpdated: "maxIterationsUpdated",
        escapeValuesPublished: "escapeValuesPublished",
        requestEscapeValues: "requestEscapeValues",
        frameComplete: "frameComplete",
        andFinally: "andFinally",
        histogramUpdateReceivedFromWorker: "histogramUpdateReceivedFromWorker",
        histogramUpdated: "histogramUpdated",
        renderImage:"renderImage",
        deadRegionsPublished: "deadRegionsPublished",
        currentFramesPerSecond: "currentFramesPerSecond",
        examinePixelState: "examinePixelState",
        publishPixelState: "publishPixelState",
        stopExaminingPixelState: "stopExaminingPixelState",
        mouseMoved: "mouseMoved",
        selectionChanged: "selectionChanged",
        leftMouseDown: "leftMouseDown",
        rightMouseDown: "rightMouseDown",
        leftMouseUp: "leftMouseUp",
        rightMouseUp: "rightMouseUp",
        zoomOutAction: "zoomOut",
        beginSelectionAction: "beginSelectionAction",
        beginMoveAction: "beginMoveAction",
        endMoveAction: "endMoveAction",
        changeSelectionAction: "changeSelectionAction",
        endSelectionAction: "endSelectionAction",
        zoomInAction: "zoomInAction",
        viewMoveAction: "viewMoveAction",
        moveSetAction: "moveSetAction",
        examinePixelAction:    "examinePixelAction",
        showDeadRegions: "showDeadRegions",
        hideDeadRegions: "hideDeadRegions"
    };
};

var events = jim.events.create();
var on = events.listenTo;
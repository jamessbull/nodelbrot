namespace("jim.actions");
jim.actions.baseAction = {
    leftMouseDown: function(e, mode) {},
    leftMouseUp: function(e, mode) {},
    rightMouseDown: function(e, mode) {},
    rightMouseUp: function(e, mode) {},
    moveMouse: function(e, mode) {}
};

jim.actions.createAction = function () {
    "use strict";
    return Object.create(jim.actions.baseAction);
};

namespace("jim.actions.doubleclick");

jim.actions.doubleclick.create = function (timer, mandelbrotSet, state) {
    "use strict";
    var action =  function () { mandelbrotSet.zoomOut(); };
    var doubleClickDuration;
    var doubleClickInProgress = false;
    var doubleClick = jim.actions.createAction();
    doubleClick.leftMouseDown = function (e) {
        if (!state.isSelectPixelMode()) {
            timer.mark("doubleClickBegin");
        }
    };
    doubleClick.leftMouseUp = function (e) {
        if (!state.isSelectPixelMode()) {
        var clickTime = timer.timeSinceMark("doubleClickBegin");

        if (doubleClickInProgress && (clickTime + doubleClickDuration) < 1000) {
            action();
            doubleClickInProgress = false;
        } else {
            if (clickTime < 1000) {
                doubleClickDuration = clickTime;
                doubleClickInProgress = true;
            }
        }
        }
    };
    return doubleClick;
};

namespace("jim.actions.selectArea");
jim.actions.selectArea.create = function (selection, mandelbrotSet, state, areaNotifier) {
    "use strict";
    var action = function () {
        mandelbrotSet.zoomTo(selection);
        var a = mandelbrotSet.state().getExtents();
        areaNotifier.notify({x: a.topLeft().x,y: a.topLeft().y,w: a.width(),h: a.height()});
    };
    var select = jim.actions.createAction();

    select.leftMouseDown = function (e) {
        if (!state.isSelectPixelMode()) {
            selection.begin(e);
        }
    };

    select.moveMouse = function (e) {
        //if (selection.inProgress)
        if (!state.isSelectPixelMode()) {
            selection.change(e);
        }
    };

    select.leftMouseUp = function (e) {
        if (!state.isSelectPixelMode()) {
            selection.end(e);
            if (selection.area().width() > 10) {
                action();
            }
        }
    };

    return select;
};

namespace("jim.actions.move");
jim.actions.move.create = function (mset, state, areaNotifier) {
    "use strict";
    var start = jim.coord.create();
    var action = jim.actions.createAction();
    action.canvas = mset.canvas();
    action.moving = false;
    var lastMoved = 0;
    var stopwatch = jim.stopwatch.create();

    action.rightMouseDown = function (e) {
        if (!state.isSelectPixelMode()) {
            action.moving = true;
            start.x = e.layerX;
            start.y = e.layerY;
            action.totalXMovement = 0;
            action.totalYMovement = 0;
            action.lastMouseXLocation = e.layerX;
            action.lastMouseYLocation = e.layerY;
        }
    };

    action.rightMouseUp = function (e) {
        if (!state.isSelectPixelMode()) {
            action.moving = false;
            mset.canvas().getContext('2d').drawImage(action.canvas, 0, 0, action.canvas.width, action.canvas.height);
            mset.move(e.layerX - start.x, e.layerY - start.y);
            var extents = mset.state().getExtents();
            areaNotifier.notify({x: extents.topLeft().x,y: extents.topLeft().y,w: extents.width(),h: extents.height()});
        }
    };

    action.show = function (context, canvas) {
        if (action.moving) {
            action.canvas = canvas;
            canvas.getContext('2d').fillStyle = "rgba(0, 0, 0, 1.0)";
            canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
            canvas.getContext('2d').drawImage(mset.canvas(), -action.totalXMovement, -action.totalYMovement, canvas.width, canvas.height);
            if(stopwatch.timeSinceMark('mousemoved') > 500) {
                if(action.cursorInMotion) {
                    var e = {layerX: action.lastMouseXLocation, layerY: action.lastMouseYLocation};
                    action.rightMouseUp(e);
                    action.rightMouseDown(e);
                    action.cursorInMotion = false;
                }
            }
        }
    };

    action.moveMouse = function (e) {
        if (!state.isSelectPixelMode()) {
            action.totalXMovement = e.layerX - start.x;
            action.totalYMovement = e.layerY - start.y;
            action.deltaX = action.lastMouseXLocation - e.layerX;
            action.deltaY = action.lastMouseYLocation - e.layerY;
            action.lastMouseXLocation = e.layerX;
            action.lastMouseYLocation = e.layerY;
            action.cursorInMotion = true;
            stopwatch.mark('mousemoved');
        }
    };
    return action;
};

namespace("jim.actions.show");
jim.actions.show.create = function (magnifiedDisplay, state) {
    "use strict";
    var displayed = false;
    var start = jim.coord.create();
    var action = jim.actions.createAction();

    action.leftMouseDown = function (e) {
        if (state.isSelectPixelMode()) {
            start.x = e.layerX;
            start.y = e.layerY;
        }
    };

    action.leftMouseUp = function (e) {
        if (state.isSelectPixelMode()) {
            var searchingCheckbox = document.getElementById("searchImageCheckbox");
            searchingCheckbox.checked = false;
            state.setNormalMode();
        }
    };

    action.moveMouse = function (e) {
        if (state.isSelectPixelMode()) {
            magnifiedDisplay.update(e.layerX, e.layerY);
        }
    };
    return action;
};
namespace("jim.actions");
jim.actions.baseAction = {
    onTrigger: function() {},
    leftMouseDown: function(e) {},
    leftMouseUp: function(e) {},
    rightMouseDown: function(e) {},
    rightMouseUp: function(e) {},
    moveMouse: function(e) {}
};

jim.actions.createAction = function () {
    "use strict";
    return Object.create(jim.actions.baseAction);
};



namespace("jim.actions.doubleclick");

jim.actions.doubleclick.create = function (timer) {
    "use strict";
    var action;
    var doubleClickDuration;
    var doubleClickInProgress = false;
    var doubleClick = jim.actions.createAction();
    doubleClick.leftMouseDown = function () {
        timer.mark("doubleClickBegin");
    };
    doubleClick.leftMouseUp = function () {
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
    };
    doubleClick.onTrigger = function (f) {
        action = f;
    };

    return doubleClick;
};

namespace("jim.actions.selectArea");
jim.actions.selectArea.create = function (selection) {
    "use strict";
    var action;
    var select = jim.actions.createAction();
    select.onTrigger = function (f) {
        action = f;
    };

    select.leftMouseDown = function (e) {
        selection.begin(e);
    };

    select.moveMouse = function (e) {
        //if (selection.inProgress)
        selection.change(e);
    };

    select.leftMouseUp = function (e) {
        selection.end(e);
        if (selection.area().width() > 10) {
            action();
        }
    };

    return select;
};

namespace("jim.actions.move");
jim.actions.move.create = function (mset) {
    "use strict";
    var start = jim.coord.create();
    var action = jim.actions.createAction();
    action.moving = false;
    var lastMoved = 0;
    var stopwatch = jim.stopwatch.create();
    action.rightMouseDown = function (e) {
        action.moving = true;
        start.x = e.layerX;
        start.y = e.layerY;
        action.totalXMovement = 0;
        action.totalYMovement = 0;
        action.lastMouseXLocation = e.layerX;
        action.lastMouseYLocation = e.layerY;
    };
    action.rightMouseUp = function (e) {
        action.moving = false;
        mset.canvas().getContext('2d').drawImage(action.canvas, 0, 0, action.canvas.width, action.canvas.height);
        mset.move(e.layerX - start.x, e.layerY - start.y);
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
        action.totalXMovement = e.layerX - start.x;
        action.totalYMovement = e.layerY - start.y;
        action.deltaX = action.lastMouseXLocation - e.layerX;
        action.deltaY = action.lastMouseYLocation - e.layerY;
        action.lastMouseXLocation = e.layerX;
        action.lastMouseYLocation = e.layerY;
        action.cursorInMotion = true;
        stopwatch.mark('mousemoved');

        if(action.moving) {
            //mset.move(-action.deltaX, -action.deltaY);
        }
    }
    return action;
};

namespace("jim.actions.show");
jim.actions.show.create = function (mset) {
    "use strict";
    var displayed = false;
    var start = jim.coord.create();
    var action = jim.actions.createAction();

    action.leftMouseDown = function (e) {
        start.x = e.layerX;
        start.y = e.layerY;
    };
    action.leftMouseUp = function (e) {
        //alert("Show a pixel at " + e.layerX + " " + e.layerY);
        var point = mset.point(e.layerX, e.layerY);
        console.log("Mandelbrot coord "+ point.mx +", " + point.my);
        console.log("Has escaped: " + point.alreadyEscaped);
        console.log("XY value " + point.x + ", "+point.y);
    };
    action.moveMouse = function (e) {};
    return action;
};

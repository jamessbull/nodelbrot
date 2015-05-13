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
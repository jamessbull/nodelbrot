namespace("jim.actions.doubleclick");
jim.actions.doubleclick.create = function (timer) {
    "use strict";
    var action;
    var doubleClickDuration;
    var doubleClickInProgress = false;
    return {
        onTrigger : function (f) {
            action = f;
        },
        leftMouseDown: function () {
            timer.mark("doubleClickBegin");
        },
        moveMouse: function (){},
        leftMouseUp: function () {
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
};

namespace("jim.actions.selectArea");
jim.actions.selectArea.create = function (selection) {
    "use strict";
    var action;
    return {
        onTrigger : function (f) {
            action = f;
        },
        leftMouseDown: function (e) {
            selection.begin(e);
        },
        moveMouse: function (e) {
            //if (selection.inProgress)
                selection.change(e);
        },
        leftMouseUp: function (e) {
            selection.end(e);
            if (selection.area().width() > 10) {
                action();
            }
        }
    };
};
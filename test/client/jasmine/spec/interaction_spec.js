describe("The user interface action", function () {
    "use strict";
    var fakeTimer =  {
        times: [],
        start: function () {},
        stop: function () {},
        mark: function (name) {},
        timeSinceMark: function (name) {
            return this.times.pop();
        }
    };

    var event = function (x, y) {
        return {
            layerX: x,
            layerY: y
        };
    };

    var actionFired = "notYet";
    var mset = {};
    mset.state = function () {
        return {
            getExtents: function () {
                return jim.rectangle.create(0,0,5,5);
            }
        };
    };

    mset.zoomOut = function () {
        actionFired += "zoomOut";
    };

    mset.zoomTo = function () {
        actionFired += "zoomTo";
    };


    var state = {};
    state.isSelectPixelMode = function () {
        return false;
    };

    it("double click should take less than a second", function () {
        fakeTimer.times = [50, 1000000, 10];
        actionFired = "notYet";

        var actions = jim.actions.doubleclick.create(fakeTimer, mset, state);

        actions.leftMouseDown(event(100, 200));
        actions.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYet");

        actions.leftMouseDown(event(100, 200));
        actions.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYet");

        actions.leftMouseDown(event(100, 200));
        actions.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYetzoomOut");
    });

    it("double click is not triggered twice by three clicks inside a second", function () {
        fakeTimer.times = [40, 50, 900];
        actionFired = "notYet";

        var action = jim.actions.doubleclick.create(fakeTimer,mset, state);

        action.leftMouseDown(event(100, 200));
        action.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYet");

        action.leftMouseDown(event(100, 200));
        action.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYetzoomOut");

        action.leftMouseDown(event(100, 200));
        action.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYetzoomOut");
    });

    it("selection is triggered only if the mouse up position is more than 10 pixels from the start", function () {
        var localSelection = jim.selection.create(jim.rectangle.create(0,0, 600, 400));

        var notifier = {
            notify: function () {

            }
        };
        var action = jim.actions.selectArea.create(localSelection, mset, state, notifier);
        actionFired = "No";

        action.leftMouseDown(event(100, 200));
        action.moveMouse(event(100, 200));
        action.leftMouseUp(event(110, 200));
        expect(actionFired).toBe("No");

        action.leftMouseDown(event(100, 200));
        action.moveMouse(event(100, 200));
        action.leftMouseUp(event(111, 200));
        expect(actionFired).toBe("NozoomTo");
    });

    it("selection begun when left mouse button depressed selection ends when left button released", function () {
        var localSelection = jim.selection.create(jim.rectangle.create(0,0, 600, 400));
        var action = jim.actions.selectArea.create(localSelection, mset, state);
        actionFired = "No";
        var perform = function (action) {
            return function () { actionFired += action; };
        };

        spyOn(localSelection, "begin");
        spyOn(localSelection, "change");
        spyOn(localSelection, "end");

        action.leftMouseDown(event(100, 200));

        expect(localSelection.begin).toHaveBeenCalled();
        expect(localSelection.change).not.toHaveBeenCalled();
        expect(localSelection.end).not.toHaveBeenCalled();

        action.moveMouse(event(200, 300));
        expect(localSelection.begin).toHaveBeenCalled();
        expect(localSelection.change).toHaveBeenCalled();
        expect(localSelection.end).not.toHaveBeenCalled();

        action.leftMouseUp(event(200, 300));
        expect(localSelection.begin).toHaveBeenCalled();
        expect(localSelection.change).toHaveBeenCalled();
        expect(localSelection.end).toHaveBeenCalled();
    });

    it("click and drag with right mouse button scrolls around mandelbrot set", function () {
        var mset = {move: function () {}};
        mset.canvas = function () {
            var c = document.createElement('canvas');
            c.width = 100;
            c.height = 100;
            return c;
        };
        mset.state = function () {
            return {
                getExtents: function () {
                    return jim.rectangle.create(0,0,5,5);
                }
            };
        };

        var moveAction = jim.actions.move.create(mset, state);
        moveAction.canvas = document.createElement('canvas');
        spyOn(mset, "move");

        moveAction.rightMouseDown(event(10, 10));
        moveAction.moveMouse(event(20, 20));
        moveAction.rightMouseUp(event(20, 20));

        expect(mset.move).toHaveBeenCalledWith(10, 10);
    });

    it("click and drag with right mouse button scrolls around mandelbrot set", function () {
        var mset = {move: function () {}};
        mset.canvas = function () {
            var c = document.createElement('canvas');
            c.width = 100;
            c.height = 100;
            return c;
        };
        mset.state = function () {
            return {
                getExtents: function () {
                    return jim.rectangle.create(0,0,5,5);
                }
            };
        };

        var moveAction = jim.actions.move.create(mset, state);
        moveAction.canvas = document.createElement('canvas');

        spyOn(mset, "move");

        moveAction.rightMouseDown(event(10, 10));
        moveAction.moveMouse(event(30, 30));
        moveAction.rightMouseUp(event(100, 200));

        expect(mset.move).toHaveBeenCalledWith(90, 190);
    });
});
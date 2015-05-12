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

    it("double click should take less than a second", function () {
        fakeTimer.times = [50,1000000, 10];
        var actions = jim.actions.doubleclick.create(fakeTimer);
        var actionFired = "notYet";
        var action = function (action) {
            return function () { actionFired += action; };
        };

        actions.onTrigger(action("doubleClick"));
        actions.leftMouseDown(event(100, 200));
        actions.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYet");

        actions.leftMouseDown(event(100, 200));
        actions.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYet");

        actions.leftMouseDown(event(100, 200));
        actions.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYetdoubleClick");
    });

    it("double click is not triggered twice by three clicks inside a second", function () {
        fakeTimer.times = [40, 50, 900];
        var action = jim.actions.doubleclick.create(fakeTimer);
        var actionFired = "notYet";
        var perform = function (action) {
            return function () { actionFired += action; };
        };

        action.onTrigger(perform("doubleClick"));
        action.leftMouseDown(event(100, 200));
        action.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYet");

        action.leftMouseDown(event(100, 200));
        action.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYetdoubleClick");

        action.leftMouseDown(event(100, 200));
        action.leftMouseUp(event(100, 200));
        expect(actionFired).toBe("notYetdoubleClick");
    });

    it("selection is triggered only if the mouse up position is more than 10 pixels from the start", function () {
        var localSelection = jim.selection.create(jim.rectangle.create(0,0, 600, 400));
        var action = jim.actions.selectArea.create(localSelection);
        var actionFired = "No";
        var perform = function (action) {
            return function () { actionFired += action; };
        };
        action.onTrigger(perform("selectArea"));

        action.leftMouseDown(event(100, 200));
        action.moveMouse(event(100, 200));
        action.leftMouseUp(event(110, 200));
        expect(actionFired).toBe("No");

        action.leftMouseDown(event(100, 200));
        action.moveMouse(event(100, 200));
        action.leftMouseUp(event(111, 200));
        expect(actionFired).toBe("NoselectArea");
    });

    it("selection begun when left mouse button depressed selection ends when left button released", function () {
        var localSelection = jim.selection.create(jim.rectangle.create(0,0, 600, 400));
        var action = jim.actions.selectArea.create(localSelection);
        var actionFired = "No";
        var perform = function (action) {
            return function () { actionFired += action; };
        };

        spyOn(localSelection, "begin");
        spyOn(localSelection, "change");
        spyOn(localSelection, "end");

        action.onTrigger(perform("selectArea"));

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
});
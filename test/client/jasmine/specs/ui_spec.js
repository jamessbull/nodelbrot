describe("The user interface action", function () {
    "use strict";

    var event = function (x, y, button) {
        return {
            layerX: x,
            layerY: y,
            button: button
        };
    };
    it("should only call leftMousedown on actions when event button is 0", function () {
        var mset = {
                zoomTo: function(selection ) {},
                zoomOut: function () {}
            },
            canvas = {},
            ui = jim.mandelbrot.ui.create(mset, canvas, 600, 480),
            action = ui.actions[0];

        spyOn(action, "leftMouseDown");
        canvas.onmousedown(event(100, 200, 2));
        expect(action.leftMouseDown).not.toHaveBeenCalled();

        canvas.onmousedown(event(100, 200, 1));
        expect(action.leftMouseDown).not.toHaveBeenCalled();

        canvas.onmousedown(event(100, 200, 0));
        expect(action.leftMouseDown).toHaveBeenCalled();
    });

    it("should only call leftMouseUp on actions when event button is 0", function () {
        var mset = {
                zoomTo: function(selection ) {},
                zoomOut: function () {}
            },
            canvas = {},
            ui = jim.mandelbrot.ui.create(mset, canvas, 600, 480),
            action = ui.actions[0];

        spyOn(action, "leftMouseUp");
        canvas.onmouseup(event(100, 200, 2));
        expect(action.leftMouseUp).not.toHaveBeenCalled();

        canvas.onmouseup(event(100, 200, 1));
        expect(action.leftMouseUp).not.toHaveBeenCalled();

        canvas.onmouseup(event(100, 200, 0));
        expect(action.leftMouseUp).toHaveBeenCalled();
    });
});
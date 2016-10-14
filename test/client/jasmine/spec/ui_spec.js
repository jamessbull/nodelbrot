describe("The user interface action", function () {
    "use strict";

    var event = function (x, y, button) {
        return {
            layerX: x,
            layerY: y,
            button: button
        };
    };

    var mset = {
            zoomTo: function(selection ) {},
            zoomOut: function () {},
            move: function () {},
            canvas: function () {return document.createElement('canvas');},
            state: function () {
                return {
                    getExtents: function () {
                        return jim.rectangle.create(0,0,7,8);
                    }
                };
            }
        },
        canvas = {},
        pixelInfo = {
            onmousedown: function () {},
            getContext: function (s) {
                return {strokeRect: function () {
                   console.log("strokeRect called");
                }};
            }
        },
        ui = jim.mandelbrot.ui.create(mset, canvas, 640, 480, pixelInfo),
        action = ui.actions[0];
        action.canvas = document.createElement('canvas');

    it("should only call rightMouseDown on actions when event button is 2", function () {
        spyOn(action, "rightMouseDown");

        canvas.onmousedown(event(100, 200, 1));
        expect(action.rightMouseDown).not.toHaveBeenCalled();

        canvas.onmousedown(event(100, 200, 0));
        expect(action.rightMouseDown).not.toHaveBeenCalled();

        canvas.onmousedown(event(100, 200, 2));
        expect(action.rightMouseDown).toHaveBeenCalled();

    });

    it("should only call rightMouseUp on actions when event button is 2", function () {
        spyOn(action, "rightMouseUp");

        canvas.onmouseup(event(100, 200, 1));
        expect(action.rightMouseUp).not.toHaveBeenCalled();

        canvas.onmouseup(event(100, 200, 0));
        expect(action.rightMouseUp).not.toHaveBeenCalled();

        canvas.onmouseup(event(100, 200, 2));
        expect(action.rightMouseUp).toHaveBeenCalled();
    });

    it("should only call leftMousedown on actions when event button is 0", function () {
        spyOn(action, "leftMouseDown");
        canvas.onmousedown(event(100, 200, 2));
        expect(action.leftMouseDown).not.toHaveBeenCalled();

        canvas.onmousedown(event(100, 200, 1));
        expect(action.leftMouseDown).not.toHaveBeenCalled();

        canvas.onmousedown(event(100, 200, 0));
        expect(action.leftMouseDown).toHaveBeenCalled();
    });

    it("should only call leftMouseUp on actions when event button is 0", function () {
        spyOn(action, "leftMouseUp");
        canvas.onmouseup(event(100, 200, 2));
        expect(action.leftMouseUp).not.toHaveBeenCalled();

        canvas.onmouseup(event(100, 200, 1));
        expect(action.leftMouseUp).not.toHaveBeenCalled();

        canvas.onmouseup(event(100, 200, 0));
        expect(action.leftMouseUp).toHaveBeenCalled();
    });
});
namespace("jim.colour.gradientui");
jim.colour.gradientui.create = function (gradientCanvas) {
    "use strict";
    var calculateFillStyle = function (colour) {
        return "rgba(" + colour.r + "," + colour.g + ","  + colour.b + "," + colour.a +")";
    };
    var context = gradientCanvas.getContext('2d');
    return {
        draw: function () {
            // so how do I want the ui to go?
            // i want to add remove nodes as well as pick colour for them.
            // Add and remove buttons for nodes drag colours from the picker
            // nodes can be moved around
            context.fillStyle = calculateFillStyle(jim.colour.create(255, 0, 0, 255));
            context.fillRect(0,0,gradientCanvas.width, gradientCanvas.height);
        }
    };
};
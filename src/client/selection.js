namespace("jim.selection");
jim.selection.create = function (rect) {
    "use strict";
    var newRect = jim.rectangle.create,
        area = newRect(0, 0, 0, 0),
        proportionateHeight = function () {
            return (rect.height() / rect.width()) * (area.bottomRight().x - area.topLeft().x);
        };
    return {
        area: function () {return area; },
        inProgress: false,
        begin: function (event) {
            area = newRect(event.layerX, event.layerY, 0, 0);
            this.inProgress = true;
        },
        change: function (event) {
            area.resize(event.layerX - area.topLeft().x, proportionateHeight());
        },
        end: function (event) {
            area.resize(event.layerX - area.topLeft().x, proportionateHeight());
            this.inProgress = false;
        },
        show: function (context) {
            if (this.inProgress) {
                context.strokeStyle = "rgba(0, 0, 0, 1.0)";
                context.strokeRect(area.topLeft().x, area.topLeft().y, area.width(), area.height());
                context.fillStyle = "rgba(255, 255, 255, 0.2)";
                context.fillRect(area.topLeft().x, area.topLeft().y, area.width(), area.height());
            }
        }
    };
}
namespace("jim.selection");
jim.selection.create = function (rect) {
    "use strict";
    var newRect = jim.rectangle.create,
        area = newRect(0, 0, 0, 0),
        proportionateHeight = function (w) {
            return (rect.height() / rect.width()) * w;
        };
    return {
        area: function () {return area; },
        inProgress: false,
        begin: function (event) {
            area = newRect(event.layerX, event.layerY, 0, 0);
            this.inProgress = true;
        },
        change: function (event) {
            var xWidth = event.layerX - area.topLeft().x;
            area.resize(xWidth, proportionateHeight(xWidth));
        },
        end: function (event) {
            var xWidth = event.layerX - area.topLeft().x;
            area.resize(xWidth, proportionateHeight(xWidth));
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
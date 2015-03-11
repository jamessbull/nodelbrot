namespace("jim.selection");
jim.selection.create = function () {
    "use strict";
    var coord = jim.coord.create;
    return {
        canvas: undefined,
        topLeft: coord(0, 0),
        bottomRight: coord(0, 0),
        inProgress: false,
        width: function () { return this.bottomRight.x - this.topLeft.x; },
        height: function () {return (this.canvas.height / this.canvas.width) * this.width(); },
        begin: function (event) {
            this.topLeft = coord(event.layerX, event.layerY);
            this.bottomRight = coord(event.layerX, event.layerY);
            this.inProgress = true;
        },
        change: function (event) {
            this.bottomRight = coord(event.layerX, event.layerY);
        },
        end: function (event) {
            this.bottomRight = coord(event.layerX, event.layerY);
            this.inProgress = false;
        },
        show: function (context) {
            if (this.inProgress) {
                context.strokeStyle = "rgba(0, 0, 0, 1.0)";
                context.strokeRect(this.topLeft.x, this.topLeft.y, this.width(), this.height());
                context.fillStyle = "rgba(255, 255, 255, 0.2)";
                context.fillRect(this.topLeft.x, this.topLeft.y, this.width(), this.height());
            }
        }
    };
}
var jim;
if (!jim) {
    jim = {};
}
jim.selection = {};
jim.selection.create = function (mandelbrotSet) {
    "use strict";
    return {
        canvas: undefined,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        inProgress: false,
        width: function () { return this.endX - this.startX; },
        height: function () {return (this.canvas.height / this.canvas.width) * this.width(); },
        begin: function (event) {
            this.startX = event.layerX;
            this.startY = event.layerY;
            this.endX   = event.layerX;
            this.endY   = event.layerY;
            this.inProgress = true;
        },
        change: function (event) {
            this.endX = event.layerX;
            this.endY = event.layerY;
        },
        end: function (event) {
            this.endX = event.layerX;
            this.endY = event.layerY;
            this.inProgress = false;
            mandelbrotSet.zoomTo(this);
        },
        show: function (context) {
            if (this.inProgress) {
                context.strokeStyle = "rgba(0, 0, 0, 1.0)";
                context.strokeRect(this.startX, this.startY, this.width(), this.height());
                context.fillStyle = "rgba(255, 255, 255, 0.2)";
                context.fillRect(this.startX, this.startY, this.width(), this.height());
            }
        }
    };
}
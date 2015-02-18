mandelbrot.ui = {
    create: function (mandelbrotSet) {
        "use strict";
        var selectionHeight = document.getElementById("selectionHeight"),
            selectionWidth = document.getElementById("selectionWidth"),
            selectionX = document.getElementById("selectionX"),
            selectionY = document.getElementById("selectionY"),
            canvas = document.getElementById("mandelbrotCanvas"),
            selection = {
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
                    selectionX.innerText = this.startX;
                    selectionY.innerText = this.startY;
                },
                change: function (event) {
                    this.endX = event.layerX;
                    this.endY = event.layerY;
                    // if I have w + h for every width how many height (origHeight / origWidth) * selectionWidth = selectionHeight
                    selectionHeight.innerText = this.height();
                    selectionWidth.innerText = this.width();
                },
                end: function (event) {
                    this.endX = event.layerX;
                    this.endY = event.layerY;
                    this.inProgress = false;
                    selectionHeight.innerText = this.height();
                    selectionWidth.innerText = this.width();
                    mandelbrotSet.zoomTo(selection);
                    console.log("selection is " + selection.startX + " " + selection.startY);
                },
                show: function (context) {
                    if (this.inProgress) {
                        context.strokeStyle = "rgba(0, 0, 0, 1.0)";
                        context.strokeRect(selection.startX, this.startY, this.width(), this.height());
                        context.fillStyle = "rgba(255, 255, 255, 0.2)";
                        context.fillRect(this.startX, this.startY, this.width(), this.height());
                    }
                }
            };

        canvas.onmousedown = function (e) {
            selection.begin(e);
        };

        canvas.onmouseup = function (e) {
            selection.end(e);
        };

        canvas.onmousemove = function (e) {
            selection.change(e);
        };
        return {
            draw: function (canvas) {
                var context = canvas.getContext('2d');
                context.clearRect(0, 0, canvas.width, canvas.height);
                selection.canvas = canvas;
                selection.show(context);
            }
        };
    }
};


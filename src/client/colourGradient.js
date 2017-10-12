namespace("jim.colour.gradientui");
jim.colour.gradientui.create = function (gradientCanvas, addButton, removeButton, palette, _events) {
    "use strict";
    var calculateFillStyle = function (colour) {
        return "rgba(" + colour.r + "," + colour.g + ","  + colour.b + "," + colour.a +")";
    };
    var context = gradientCanvas.getContext('2d');
    var drawLine = function (fromX, fromY, toX, toY) {
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.strokeStyle='antiquewhite';
        context.lineWidth = 2;
        context.stroke();
    };
    var drawCircle = function (x, y, r, c, selected) {
        context.beginPath();
        context.arc(x, y, r, 0, 2 * Math.PI, false);
        context.fillStyle = 'rgba('+ c.r +',' + c.g + ',' + c.b + ',' + c.a + ')';
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = !selected ? 'gray' : 'antiquewhite';
        context.stroke();
    };
    var drawTriangle = function (x, y, w, h, selected) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + w , y - h);
        context.lineTo(x + (2 * w), y);
        context.lineTo(x, y);
        context.lineWidth = 1;
        context.fillStyle = !selected ? 'gray' : 'antiquewhite';
        context.fill();
    };
    var length = gradientCanvas.width - 15;

    var drawMarker = function (x, y, c, selected) {
        drawCircle(x, y, 9, c, selected);
        drawTriangle(x - 5, y - 8, 5, 10, selected);
    };
    var drawTicks = function () {
        var increment = length / 10;
        var start = 7;
        var total = length + start;

        for (start; start <= total; start += increment) {
            drawLine(start, 4, start, 10);
        }
    };

    var interpolate = jim.interpolator.create().interpolate;
    var selectedNode = null;
    var markers = {
        selecting: false,
        length: length,
        nodes: [],
        selectionTolerance: 0.025,

        setColour:function (tc) {
            selectedNode.node.setColour(tc);
        },
        drawMarkers: function () {
            this.nodes.forEach (function (nodeInfo) {
                var x = Math.floor(interpolate(10, length + 10, nodeInfo.node.position));
                x = x - 3;
                drawMarker(x, 22, nodeInfo.node.rgb, nodeInfo.selected);
            });
        },
        stopMoving : function () {
            this.selecting = false;
        },
        add: function (node) {
            var n = { node: node, selected: true };
            this.nodes.push(n);
            selectedNode = n;
        },
        updatePosition: function (x) {
            if (this.selecting) {
                var position = this.fractionalPosition(x);
                if (position > 1) position = 1;
                if (position < 0) position = 0;
                selectedNode.node.setPosition(position);
                palette.sort();
            }
        },
        fractionalPosition: function (x) {
            return  (x - 10) / this.length;
        },
        at: function (x) {
            var self = this;
            var distanceToNode = function (nodeInfo, x) { return  Math.abs(nodeInfo.node.position - self.fractionalPosition(x)); };
            return this.nodes.filter(function (nodeInfo) { return distanceToNode(nodeInfo, x) < self.selectionTolerance; })[0];
        },
        select: function (position) {
            this.selecting = true;
            this.nodes.forEach(function (node) { node.selected = false; });
            var potentialNode = this.at(position);
            if(potentialNode) {
                selectedNode = potentialNode;
                potentialNode.selected = true;
            }
        },
        selected: function () { return selectedNode; },
        removeSelectedNode: function () {
            palette.removeNode(selectedNode.node);
            this.nodes = this.nodes.filter(function (node) { return !node.selected; });
        },
        placeNewMarker: function () {
            this.add(palette.addNode());
        },
        build: function () {
            this.nodes = [];
            var self = this;
            palette.getNodes().forEach(function (node) { self.add(node); });
        }
    };

    var clearDisplay = function () {
        context.clearRect(0,0, gradientCanvas.width, gradientCanvas.height);
    };

    markers.build();

    addButton.onclick = function () {
        markers.placeNewMarker();
        _events.fire(_events.paletteChanged, palette);
     };

    removeButton.onclick = function () {
        markers.removeSelectedNode();
        _events.fire(_events.paletteChanged, palette);
    };

    gradientCanvas.onmousedown = function (e) {
        markers.select(e.layerX);
    };

    gradientCanvas.onmouseup = function (e) {
        markers.stopMoving();
    };

    gradientCanvas.onmouseout = function () {
       markers.stopMoving();
    };

    gradientCanvas.onmousemove = function (e) {
        markers.updatePosition(e.layerX);
        _events.fire(_events.paletteChanged, palette);
    };

    function draw () {
        clearDisplay();
        drawTicks();
        drawLine(5, 3, length +8, 3);
        markers.drawMarkers();
    }

    on(events.paletteChanged, function () {
        draw();
    });

    on(events.colourSelected, function () {
        draw();
    });

    return {
        draw: function () {
            draw();
        },
        setSelectedNodeColour: function(tc) {
            markers.setColour(tc);
            _events.fire(_events.paletteChanged, palette);
        },
        rebuildMarkers: function () {
            markers.build();
        }

    };
};
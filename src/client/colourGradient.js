namespace("jim.colour.gradientui");
jim.colour.gradientui.create = function (gradientCanvas, addButton, removeButton, palette, paletteNotifer) {
    "use strict";
    var calculateFillStyle = function (colour) {
        return "rgba(" + colour.r + "," + colour.g + ","  + colour.b + "," + colour.a +")";
    };
    var context = gradientCanvas.getContext('2d');
    var drawLine = function (fromX, fromY, toX, toY) {
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.lineWidth = 1;
        context.strokeStyle = 'rgba(30,255,30,255)';
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
    var drawMarker = function (x, y, c, selected) {
        drawCircle(x, y, 9, c, selected);
        drawTriangle(x - 5, y - 8, 5, 10, selected);
    };
    var drawTicks = function () {
        drawLine(10, 0, 10, 3);
        drawLine(110, 0, 110, 3);
        drawLine(210, 0, 210, 3);
        drawLine(310, 0, 310, 3);
        drawLine(410, 0, 410, 3);
        drawLine(510, 0, 510, 3);
    };

    var interpolate = jim.interpolator.create().interpolate;
    var selectedNode = null;
    var markers = {
        selecting: false,
        length: 500,
        nodes: [],
        selectionTolerance: 0.025,

        setColour:function (tc) {
            selectedNode.node.setColour(tc);
        },
        drawMarkers: function () {
            this.nodes.forEach (function (nodeInfo) {
                var x = Math.floor(interpolate(10, 510, nodeInfo.node.position));
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
                selectedNode.node.setPosition(this.fractionalPosition(x));
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
        paletteNotifer.notifyPalette(palette.toNodeList());
    };

    removeButton.onclick = function () {
        markers.removeSelectedNode();
        paletteNotifer.notifyPalette(palette.toNodeList());
    };

    gradientCanvas.onmousedown = function (e) {
        markers.select(e.layerX);
    };

    gradientCanvas.onmouseup = function (e) {
        markers.stopMoving();
    };

    gradientCanvas.onmousemove = function (e) {
        markers.updatePosition(e.layerX);
        paletteNotifer.notifyPalette(palette.toNodeList());
    };

    return {
        draw: function () {
            clearDisplay();
            drawTicks();
            drawLine(5, 3, 515, 3);
            markers.drawMarkers();
        },
        setSelectedNodeColour: function(tc) {
            markers.setColour(tc);
        },
        rebuildMarkers: function () {
            markers.build();
        }

    };
};
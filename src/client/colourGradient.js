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
        context.strokeStyle = 'black';
        context.stroke();
    };
    var drawCircle = function (x, y, r, c, selected) {
        context.beginPath();
        context.arc(x, y, r, 0, 2 * Math.PI, false);
        context.fillStyle = 'rgba('+ c.r +',' + c.g + ',' + c.b + ',' + c.a + ')';
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = !selected ? 'gray' : 'black';
        context.stroke();
    };
    var drawTriangle = function (x, y, w, h, selected) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + w , y - h);
        context.lineTo(x + (2 * w), y);
        context.lineTo(x, y);
        context.lineWidth = 1;
        context.fillStyle = !selected ? 'gray' : 'black';
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
    var highlightSelectionRange = function (x, y, w, h) {
       drawLine(x, y, x + w, y);
       drawLine(x + w, y, x + w, y + h);
       drawLine(x + w, y + h, x, y + h);
       drawLine(x, y + h, x, y);
    };

    var interpolate = jim.interpolator.create().interpolate;

    // How do I select and move?
    var markers = {
        selecting: false,
        nodes: [],
        selectionTolerance: 0.025,
        selectionMarkers: [],
        drawSelection: function () {
            this.selectionMarkers.forEach(function (marker) {
                marker.ttl--;
                highlightSelectionRange(marker.x, marker.y, marker.w, marker.h);
            });
            this.selectionMarkers = this.selectionMarkers.filter(function (m) {return m.ttl >0;});
        },
        setColour:function (tc) {
            this.nodes.forEach(function (nodeInfo) {
                if(nodeInfo.selected) {
                    nodeInfo.node.setColour(tc);
                }
            });
        },
        addSelectionMarker: function (x) {
            var fraction = (x - 10) / 500;
            var selX = ((fraction - this.selectionTolerance) * 500 ) + 10;
            var width = (x - selX) * 2;
            this.selectionMarkers.push({x: selX,y: 0,w: width,h: 40, ttl:10});

        },
        drawMarkers: function () {
            var self = this;
            this.nodes.forEach (function (nodeInfo) {
                var x = Math.floor(interpolate(10, 510, nodeInfo.node.position));
                x = x - 3;
                drawMarker(x, 22, nodeInfo.node.toRgb(), nodeInfo.selected);
            });
        },
        stopMoving : function () {
            this.selecting = false;
        },
        add: function (node) {
            this.nodes.push({
                node: node,
                selected: false,
                select: function () {
                    this.selected = true;
                }
            });
        },
        updatePosition: function (x) {
            var selecting = this.selecting;
            this.nodes.forEach(function (node) {
                if (node.selected && selecting) {
                    node.node.position = ((x - 10) / 500);
                }
            });
        },
        at: function (x) {
            var nodeToReturn;
            var self = this;
            this.nodes.forEach(function (nodeInfo) {
                var fraction = (x - 10) / 500;
                var distanceToNode = Math.abs(nodeInfo.node.position - fraction);
                if(distanceToNode < self.selectionTolerance ){
                    nodeToReturn = nodeInfo;
                }
            });
            return nodeToReturn;
        },
        select: function (x) {
            this.selecting = true;
            this.nodes.forEach(function (n) {
                n.selected = false;
            });
            this.addSelectionMarker(x);
            var m = this.at(x);
            if(m) {
                m.select();
            }
        }, selected: function () {
            var toReturn;
            this.nodes.forEach(function (n) {
                if(n.selected) {
                  toReturn = n ;
                }
            });
            return toReturn;
        }, removeSelectedNode: function () {
            var selectedNodeInfo = this.nodes.filter(function (nodeInfo) {return nodeInfo.selected;})[0];
            this.nodes = this.nodes.filter(function (node) { return !node.selected; });
            var filteredNodes = palette.nodes().filter(function (node) {
                var nodeToRemove = node.position === selectedNodeInfo.node.position;
                return !nodeToRemove;
            });
            palette.setNodes(filteredNodes);
        }, placeNewMarker: function () {
            var newNode = palette.addNode();
            this.add(newNode);
        },build: function () {
            this.nodes = [];
            var self = this;
            palette.nodes().forEach(function (node) {
                self.add(node);
            });
        }

    };

    var clearDisplay = function () {
        context.clearRect(0,0, gradientCanvas.width, gradientCanvas.height);
    };

    markers.build();

    addButton.onclick = function () {
        // where do I want to add new nodes?
        // How about right at the beginning because it is easy
        // Find largest gap and add node in middle
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
            //markers.drawSelection();
        },
        setSelectedNodeColour: function(tc) {
            markers.setColour(tc);
        },
        rebuildMarkers: function () {
            markers.build();
        }

    };
};
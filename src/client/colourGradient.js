import { interpolate } from "./math.js";
import { forwardTouchToMouse } from "./ui/touch.js";

export function createGradientEditor(gradientCanvas, addButton, removeButton, palette, _events) {
    const on = _events.listenTo;
    let leftMouseDown = false;
    const context = gradientCanvas.getContext('2d');
    const drawLine = function (fromX, fromY, toX, toY) {
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.strokeStyle='antiquewhite';
        context.lineWidth = 2;
        context.stroke();
    };
    const drawCircle = function (x, y, r, c, selected) {
        context.beginPath();
        context.arc(x, y, r, 0, 2 * Math.PI, false);
        context.fillStyle = 'rgba('+ c.r +',' + c.g + ',' + c.b + ',' + c.a + ')';
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = !selected ? 'gray' : 'antiquewhite';
        context.stroke();
    };
    const drawTriangle = function (x, y, w, h, selected) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + w , y - h);
        context.lineTo(x + (2 * w), y);
        context.lineTo(x, y);
        context.lineWidth = 1;
        context.fillStyle = !selected ? 'gray' : 'antiquewhite';
        context.fill();
    };
    const length = gradientCanvas.width - 15;

    const drawMarker = function (x, y, c, selected) {
        drawCircle(x, y, 9, c, selected);
        drawTriangle(x - 5, y - 8, 5, 10, selected);
    };
    // The palette's colours from position 0 to 1, as a strip under the markers, lined up with them.
    const gradientTop = 36;
    const drawGradient = function () {
        const width = length + 1;
        const height = gradientCanvas.height - gradientTop - 4;
        const strip = context.createImageData(width, height);
        for (let x = 0; x < width; x += 1) {
            const colour = palette.colourAt(x / length);
            for (let y = 0; y < height; y += 1) {
                const i = ((y * width) + x) * 4;
                strip.data[i] = colour.r;
                strip.data[i + 1] = colour.g;
                strip.data[i + 2] = colour.b;
                strip.data[i + 3] = 255;
            }
        }
        context.putImageData(strip, 7, gradientTop);
    };

    const drawTicks = function () {
        const increment = length / 10;
        let start = 7;
        const total = length + start;

        for (start; start <= total; start += increment) {
            drawLine(start, 4, start, 10);
        }
    };

    let selectedNode = null;
    const markers = {
        selecting: false,
        length: length,
        nodes: [],
        selectionTolerance: 0.025,

        setColour:function (hsv, x, y) {
            if (selectedNode.selected) {
                this.setMarker(x, y);
                selectedNode.node.setColour(hsv);
            }
        },
        // Where the selected node's colour is shown on the colour picker.
        setMarker: function (x, y) {
            if (selectedNode.selected) {
                selectedNode.markerX = x;
                selectedNode.markerY = y;
            }
        },
        drawMarkers: function () {
            this.nodes.forEach (function (nodeInfo) {
                let x = Math.floor(interpolate(10, length + 10, nodeInfo.node.position));
                x = x - 3;
                drawMarker(x, 22, nodeInfo.node.rgb, nodeInfo.selected);
            });
        },
        stopMoving : function () {
            this.selecting = false;
        },
        add: function (node, doNotRandomise) {
            if (selectedNode) selectedNode.selected = false;
            const n = { node: node, selected: true, doNotRandomise: doNotRandomise };
            selectedNode = n;
            this.nodes.push(n);
            _events.fire(_events.nodeAdded, n);
        },
        updatePosition: function (x) {
            if (this.selecting) {
                let position = this.fractionalPosition(x);
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
            const self = this;
            const distanceToNode = function (nodeInfo, x) { return  Math.abs(nodeInfo.node.position - self.fractionalPosition(x)); };
            return this.nodes.filter(function (nodeInfo) { return distanceToNode(nodeInfo, x) < self.selectionTolerance; })[0];
        },
        select: function (position) {
            this.selecting = true;
            this.nodes.forEach(function (node) { node.selected = false; });
            const potentialNode = this.at(position);
            if(potentialNode) {
                selectedNode = potentialNode;
                potentialNode.selected = true;
                _events.fire(_events.colourSelected, {x: potentialNode.markerX, y: potentialNode.markerY, hue: potentialNode.node.hsv.h} );
            }
        },
        selected: function () { return selectedNode; },
        removeSelectedNode: function () {
            if(!selectedNode || !selectedNode.node) {
                selectedNode = this.nodes[0];
                selectedNode.selected = true;
                this.removeSelectedNode();
            } else {
                palette.removeNode(selectedNode.node);
                this.nodes = this.nodes.filter(function (node) { return !node.selected; });
                selectedNode = null;
            }
        },
        placeNewMarker: function () {
            this.add(palette.addNode());
        },
        build: function (doNotRandomise) {
            this.nodes = [];
            const self = this;
            palette.getNodes().forEach(function (node) {
                self.add(node, doNotRandomise);
            });
        }
    };

    const clearDisplay = function () {
        context.clearRect(0,0, gradientCanvas.width, gradientCanvas.height);
    };

    markers.build();

    function draw () {
        clearDisplay();
        drawTicks();
        drawLine(5, 3, length +8, 3);
        markers.drawMarkers();
        drawGradient();
    }

    addButton.onclick = function () {
        markers.placeNewMarker();
        _events.fire(_events.paletteChanged, palette);
        _events.fire(_events.pulseUI);
     };

    removeButton.onclick = function () {
        markers.removeSelectedNode();
        _events.fire(_events.paletteChanged, palette);
        _events.fire(_events.pulseUI);

    };

    gradientCanvas.onmousedown = function (e) {
        markers.select(e.offsetX);
        leftMouseDown = true;
        draw();
    };

    gradientCanvas.onmouseup = function (e) {
        markers.stopMoving();
        leftMouseDown = false;
        _events.fire(_events.pulseUI);

    };

    gradientCanvas.onmouseout = function () {
       markers.stopMoving();
        leftMouseDown = false;
        _events.fire(_events.pulseUI);
    };

    gradientCanvas.onmousemove = function (e) {
        markers.updatePosition(e.offsetX);
        if(leftMouseDown) {
            _events.fire(_events.start);
            _events.fire(_events.paletteChanged, palette);
        }
    };

    forwardTouchToMouse(gradientCanvas, {
        down: gradientCanvas.onmousedown,
        move: gradientCanvas.onmousemove,
        up: gradientCanvas.onmouseup
    });

    on(_events.paletteChanged, function () {
        draw();
    });

    on(_events.colourSelected, function () {
        draw();
    });

    return {
        draw: function () {
            draw();
        },
        setSelectedNodeColour: function(hsv, x, y) {
            markers.setColour(hsv, x, y);
            _events.fire(_events.paletteChanged, palette);
        },
        setSelectedNodeMarker: function(x, y) {
            markers.setMarker(x, y);
        },
        rebuildMarkers: function (doNotRandomise) {
            markers.build(doNotRandomise);
        }

    };
}

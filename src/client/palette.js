namespace("jim.palette.colourNode");
var nodeid = 0;
jim.palette.colourNode.create = function(hsv, position) {
    "use strict";
    nodeid +=1;
    var tc = tinycolor(hsv);
    var rgb = tc.toRgb();
    rgb.a = 255;
    return {
        id:nodeid,
        hsv:hsv,
        rgb:rgb,
        position:position,
        setPosition: function (p) {
            this.position = p;
        },
        setColour: function (tc) {
            this.colour = tc;
            this.hsv = this.colour.toHsv();
            this.rgb = this.colour.toRgb();
            this.rgb.a = 255;
        }
    };
};

namespace("jim.palette");
jim.palette.create = function (events) {
    "use strict";

    events.listenTo(events.colourSelected, function (args) {
        selectedColour = args.hue;
    });

    var colourNode = jim.palette.colourNode.create;
    var hsv = function (h, s, v){ return { h: h, s: s, v: v }; };
    var orange = tinycolor({r: 253, g:193, b:27, a: 255}).toHsv();
    var black = hsv(100,"0%","0%");
    var white = hsv(10, "0%", "100%");
    var defaultFromNode = colourNode(black, 0);
    var defaultToNode = colourNode(white, 1);
    var interpolate = jim.interpolator.create().interpolate;
    var rgb = {r:0,g:0,b:0,a:0};
    var selectedColour = hsv(0,'100%', '100%');
    var nodes = [colourNode(white,0.00), colourNode(orange,0.90), colourNode(black,1.0)];

    function middleOfLargestGap() {
        var lastNode = {};
        lastNode.position = 0;
        var tempNodes = nodes.slice();
        tempNodes.push(defaultToNode);
        tempNodes.unshift(defaultFromNode);
        var gaps = tempNodes.map(function (node) {
            var lastPosition = lastNode.position;
            lastNode.position = node.position;
            return {
                start : lastPosition,
                end : node.position,
                gap: function () {return this.end - this.start;},
                midPoint: function () {return this.start + (this.gap()/2);}
            };
        });
        return gaps.reduce(function(a,b) {
            if (a.gap() > b.gap()) {
                return a;
            }
            return b;
        }).midPoint();
    }

    function randomColour () {
        var hue = Math.random() * 360;
        var lightness = "100%";
        var saturation = (Math.random() * 100) + "%";
        return hsv(hue, saturation,lightness);
    }

    var colourNodes = {
        colourAt: function (n) {
            var numberOfNodes = nodes.length;
            var from = defaultFromNode;
            var to = defaultToNode;
            var currentNode;
            var fromColour;
            var toColour;
            var fraction;
            var nodeCounter;
            var actualColour = rgb;

            for (nodeCounter = 0 ; nodeCounter < numberOfNodes; nodeCounter++) {
                currentNode = nodes[nodeCounter];
                if (currentNode.position <= n) {
                    from = nodes[nodeCounter];
                }

                if (currentNode.position > n) {
                    to = currentNode;
                    break;
                }
            }

            fromColour = from.rgb;
            toColour = to.rgb;
            fraction =  (n - from.position) / (to.position - from.position);

            actualColour.r = interpolate(fromColour.r, toColour.r, fraction);
            actualColour.g = interpolate(fromColour.g, toColour.g, fraction);
            actualColour.b = interpolate(fromColour.b, toColour.b, fraction);
            actualColour.a = 255;
            return actualColour;
        },
        addSpecificNode: function (hue, position) {
            nodes.push(colourNode(hsv(hue, "100%", "100%"), position));
        },
        addNode: function () {

            var retVal = colourNode(randomColour(), middleOfLargestGap());
            nodes.push(retVal);
            this.sort();
            return retVal;
        },
        removeNode: function (_node) {
            nodes = nodes.filter(function (node) { return _node.id !== node.id; });
        },
        setNodes: function (_nodes) {
            nodes = _nodes;
        },
        getNodes: function () {
            return nodes;
        },
        sort: function () {
            nodes.sort(function (a, b) {
                return a.position - b.position;
            });
        },
        fromNodeList:function (_nodes) {
            nodes = _nodes.map(function (node) { return colourNode(node.colourDesc, node.position); });
            colourNodes.sort();
        },
        toNodeList: function () {
            return nodes.map(function (n) { return {position: n.position, colourDesc: n.hsv}; });
        }
    };

    return colourNodes;
};

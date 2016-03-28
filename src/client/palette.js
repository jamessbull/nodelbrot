namespace("jim.palette.colourNode");
jim.palette.colourNode.create = function(hsv, position) {
    "use strict";
    var tc = tinycolor(hsv);
    var rgb = tc.toRgb();
    rgb.a = 255;
    return {
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
jim.palette.create = function () {
    "use strict";
    var colourNode = jim.palette.colourNode.create;
    var hsv = function (h, s, v){ return { h: h, s: s, v: v }; };
    var orange = hsv(39,"100%","100%");
    var gold = hsv(51,"100%","100%");
    var yellow = hsv(60,"100%","100%");
    var blue = hsv(250,"100%","100%");
    var cyan = hsv(170,"100%","100%");
    var black = hsv(100,"0%","0%");
    var white = hsv(10, "0%", "100%");
    var defaultFromNode = colourNode(black, 0);
    var defaultToNode = colourNode(white, 1);
    var interpolate = jim.interpolator.create().interpolate;
    var rgb = {r:0,g:0,b:0,a:0};
    var nodes = [colourNode(orange,0), colourNode(gold, 0.5), colourNode(yellow, 0.85), colourNode(cyan,0.85),colourNode(blue,1)];
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
        addNode: function () {
            var retVal = colourNode(blue, 0.5);
            nodes.push(retVal);
            this.sort();
            return retVal;
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

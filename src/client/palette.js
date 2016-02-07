namespace("jim.palette");
jim.palette.create = function () {
    "use strict";
    var pal = [];
    var hsv = function (h, s, v){ return { h: h, s: s, v: v }; };

    var orange = hsv(39,"100%","100%");
    var gold = hsv(51,"100%","100%");
    var yellow = hsv(60,"100%","100%");
    var blue = hsv(250,"100%","100%");
    var cyan = hsv(170,"100%","100%");
    var black = hsv(100,"0%","0%");
    var white = hsv(100, "0%", "100%");

    var colourNode = function(hsv, position) {
        return {
            hsv:tinycolor(hsv).toHsv(),
            colour:tinycolor(hsv),
            position:position,
            setColour: function (tc) {
                this.colour = tc;
                this.hsv = this.colour.toHsv();
            },
            before: function (n) { return this.position <= n; },
            after: function (n) {return this.position >= n;},
            toRgb: function () {
                var c = this.colour;
                c.a = 255;
                return c.toRgb();
            }
        };
    };

    var defaultFromNode = colourNode(black, 0);
    var defaultToNode = colourNode(white, 1);


    var find = function(nodes, f) {
        var found = nodes[0];
        nodes.forEach(function (node) {
            if (f(found, node)) found = node;
        });
        return found;
    };
    var smallestNode = function (nodes) {
        return find(nodes, function (n, n2) {return n2.position < n.position;});
    };
    var largestNode  = function (nodes) {
        return find(nodes, function (n, n2) {return n2.position > n.position;});
    };


    var interpolate = jim.interpolator.create().interpolate;

    var colourNodes = {
        nodes:[colourNode(orange,0), colourNode(gold, 0.5), colourNode(yellow, 0.85), colourNode(cyan,0.85),colourNode(blue,1)],
        from: function (n) {
            var smallerNodes = this.nodes.filter(function(node) { return node.before(n); });
            return smallerNodes.length > 0 ?
                largestNode(smallerNodes) :
                defaultFromNode;
        },
        to: function (n) {
            var largerNodes = this.nodes.filter(function(node) { return node.after(n); });
            return largerNodes.length > 0 ?
                smallestNode(largerNodes) :
                defaultToNode;
        },
        at: function (n) {
            var f = this.from(n);
            var t = this.to(n);
            var n2 =  (n - f.position) / (t.position - f.position);
            return tinycolor({
                h: interpolate(f.hsv.h, t.hsv.h, n2),
                s: interpolate(f.hsv.s, t.hsv.s, n2),
                v: interpolate(f.hsv.v, t.hsv.v, n2)
            });
        }
    };

    return {
        colourAt: function (number) {
            var currentColour =  colourNodes.at(number).toRgb();
            currentColour.a = 255;
            return currentColour;
        },
        toArray: function () { return pal; },
        nodes: function () { return colourNodes.nodes; },
        setNodes: function (nodes) {
            colourNodes.nodes = nodes;
        }, addNode: function () {
            var biggestGapNode;
            var toBiggestNode;
            var currentgap = 0;
            if (colourNodes.nodes.length <1) {
                biggestGapNode = defaultFromNode;
            }
            var lastNode = colourNodes.nodes[0];
            colourNodes.nodes.forEach(function (node) {

                var gap = node.position - lastNode.position;
                if (gap > currentgap) {
                    currentgap = gap;
                    biggestGapNode = lastNode;
                    toBiggestNode = node;
                }
                lastNode = node;
            });
            var newPos = biggestGapNode.position + ((toBiggestNode.position - biggestGapNode.position)/2);
            var retVal = colourNode(blue, newPos);
            colourNodes.nodes.push(retVal);
            return retVal;
        }
    };
};

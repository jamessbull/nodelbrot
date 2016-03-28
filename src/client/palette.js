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
    var white = hsv(10, "0%", "100%");

    var colourNodes = {};
    var colourNode = function(hsv, position) {
        var tc = tinycolor(hsv);
        var rgb = tc.toRgb();
        rgb.a = 255;
        return {
            hsv:tc.toHsv(),
            rgb:rgb,
            colour:tc,
            position:position,
            setPosition: function (p) {
                this.position = p;
                colourNodes.sort();
            },
            setColour: function (tc) {
                this.colour = tc;
                this.hsv = this.colour.toHsv();
                this.rgb = this.colour.toRgb();
                this.rgb.a = 255;
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

// so the whole from thing is to find out what the from and to nodes are.
// as it is called for every pixel we can iterate the nodes once. Best to sort the nodes when
// the nodes are updated if we know they are sorted then I can iterate through until the node is bigger then get the previous one
// if the first one is bigger then it is black and node 1 - if last one is smaller then it is last node and white
// I want to sort nodes on add or change
    var interpolate = jim.interpolator.create().interpolate;
    var l;
    var from;
    var to;
    var currentNode;
    var fc;
    var tc;
    var n2;
    var i;
    var rgba = {};
    colourNodes = {
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
            l = this.nodes.length;
            from = defaultFromNode;
            to = defaultToNode;

            for (i = 0 ; i < l; i++) {
                currentNode = this.nodes[i];
                if (currentNode.position <= n) {
                    from = this.nodes[i];
                }

                if (currentNode.position > n) {
                    to = currentNode;
                    break;
                }
            }
            fc = from.rgb;
            tc = to.rgb;
            n2 =  (n - from.position) / (to.position - from.position);

            rgba.r = interpolate(fc.r, tc.r, n2);
            rgba.g = interpolate(fc.g, tc.g, n2);
            rgba.b = interpolate(fc.b, tc.b, n2);
            rgba.a = 255;
            return rgba;
        },
        sort: function () {
            this.nodes.sort(function (a, b) {
                return a.position - b.position;
            });
        }
    };

    return {
        colourAt: function (number) {
            return  colourNodes.at(number);
        },
        toArray: function () { return pal; },
        nodes: function () { return colourNodes.nodes; },
        setNodes: function (nodes) {
            colourNodes.nodes = nodes;
        }, addNode: function () {
            var newPos = 0.5;
            var retVal = colourNode(blue, newPos);
            colourNodes.nodes.push(retVal);
            colourNodes.sort();
            return retVal;
        },
        fromNodeList: function (nodeList) {
            colourNodes.nodes = nodeList.map(function (node) {
                return colourNode(node.colourDesc, node.position);
            });
            colourNodes.sort();
        },
        toNodeList: function () {
            var nodeList = [];
            return colourNodes.nodes.map(function (n) {
                return {position: n.position, colourDesc: n.colour.getOriginalInput()};
            });
        }
    };
};

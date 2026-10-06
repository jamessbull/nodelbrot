namespace("jim.palette.colourNode");
var nodeid = 0;
jim.palette.colourNode.create = function(hsv, position) {
    "use strict";
    nodeid +=1;
    var tc = jim.tinycolor(hsv);
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
jim.palette.create = function () {
    "use strict";
    var colourNode = jim.palette.colourNode.create;
    var hsv = function (h, s, v){ return { h: h, s: s, v: v }; };
    var orange = jim.tinycolor({r: 243, g:193, b:27, a: 255}).toHsv();
    var black = hsv(100,"0%","0%");
    var white = hsv(10, "0%", "100%");
    var defaultFromNode = colourNode(black, 0);
    var defaultToNode = colourNode(white, 1);
    var interpolate = jim.interpolator.create().interpolate;
    var rgb = {r:0,g:0,b:0,a:0};
    var nodes = [ colourNode(orange,0.80)];

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

    // How colours are blended between nodes: "rgb" blends red, green and blue separately; "hsv" blends
    // hue (the shorter way round the colour wheel), saturation and value, so it passes through the
    // hues in between rather than through greys.
    var blend = "rgb";

    // h in degrees from 0 to 360, s and v from 0 to 1.
    function rgbToHsv(c) {
        var r = c.r / 255, g = c.g / 255, b = c.b / 255;
        var max = Math.max(r, g, b);
        var delta = max - Math.min(r, g, b);
        var h = 0;
        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta) % 6;
            } else if (max === g) {
                h = ((b - r) / delta) + 2;
            } else {
                h = ((r - g) / delta) + 4;
            }
            h = h < 0 ? (h * 60) + 360 : h * 60;
        }
        return {h: h, s: max === 0 ? 0 : delta / max, v: max};
    }

    function hsvToRgb(h, s, v, out) {
        var chroma = v * s;
        var sector = h / 60;
        var x = chroma * (1 - Math.abs((sector % 2) - 1));
        var m = v - chroma;
        var r = 0, g = 0, b = 0;
        if (sector < 1) { r = chroma; g = x; }
        else if (sector < 2) { r = x; g = chroma; }
        else if (sector < 3) { g = chroma; b = x; }
        else if (sector < 4) { g = x; b = chroma; }
        else if (sector < 5) { r = x; b = chroma; }
        else { r = chroma; b = x; }
        out.r = (r + m) * 255;
        out.g = (g + m) * 255;
        out.b = (b + m) * 255;
        out.a = 255;
        return out;
    }

    function hsvBlend(fromRgb, toRgb, fraction, out) {
        var from = rgbToHsv(fromRgb);
        var to = rgbToHsv(toRgb);
        // White and greys have no hue of their own, so they take the hue of the other end. Black has
        // no saturation either, so it takes both, and blending a colour with black just darkens it.
        if (from.v === 0) from.s = to.s;
        if (to.v === 0) to.s = from.s;
        if (from.s === 0) from.h = to.h;
        if (to.s === 0) to.h = from.h;
        var hueChange = to.h - from.h;
        if (hueChange > 180) hueChange -= 360;
        if (hueChange < -180) hueChange += 360;
        var h = (from.h + (hueChange * fraction) + 360) % 360;
        return hsvToRgb(h, interpolate(from.s, to.s, fraction), interpolate(from.v, to.v, fraction), out);
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

            if (blend === "hsv") {
                return hsvBlend(fromColour, toColour, fraction, actualColour);
            }
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
        },
        blend: function () {
            return blend;
        },
        // Anything other than "hsv" means "rgb", so palettes saved before there was a choice stay RGB.
        setBlend: function (_blend) {
            blend = _blend === "hsv" ? "hsv" : "rgb";
        },
        // The colours at size evenly spaced positions from 0 to 1, each packed as RGBA bytes in the
        // order canvas image data uses, so an entry can be written to a Uint32Array view of image data.
        toLookupTable: function (size) {
            var table = new Uint32Array(size);
            var bytes = new Uint8ClampedArray(table.buffer);
            for (var i = 0; i < size; i += 1) {
                var colour = colourNodes.colourAt(i / (size - 1));
                bytes[i * 4] = colour.r;
                bytes[(i * 4) + 1] = colour.g;
                bytes[(i * 4) + 2] = colour.b;
                bytes[(i * 4) + 3] = 255;
            }
            return table;
        }
    };

    return colourNodes;
};

// Colours in palettes are hue, saturation and value: {h, s, v}. Until 2026 they were converted with the
// tinycolor library, and saved palettes (in bookmark links) hold whatever form it accepted, so these read
// them exactly as tinycolor did and saved palettes keep their colours.

// A saturation or value as a fraction from 0 to 1. Accepts fractions from 0 to 1, larger numbers as
// percentages, and percentage strings such as "88.9%". Percentages count only to two decimal places,
// and fractions are treated as percentages, as tinycolor did.
jim.colour.fraction = function (value) {
    "use strict";
    var n = parseFloat(value);
    var percentage = (typeof value === "string" && value.indexOf("%") !== -1) || n <= 1;
    if (percentage && !(typeof value === "string" && value.indexOf("%") !== -1)) {
        n = n * 100;
    }
    n = Math.min(100, Math.max(0, n));
    if (percentage) {
        n = Math.floor(n * 100) / 100;
    }
    return Math.abs(n - 100) < 0.000001 ? 1 : (n % 100) / 100;
};

// Hue (h, in degrees), saturation and value (s and v, fractions from 0 to 1) to red, green and blue from
// 0 to 255, unrounded, written to out.
jim.colour.hsvToRgb = function (h, s, v, out) {
    "use strict";
    var hue = Math.min(360, Math.max(0, h));
    var sector = (Math.abs(hue - 360) < 0.000001 ? 1 : (hue % 360) / 360) * 6;
    var i = Math.floor(sector);
    var f = sector - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    var r, g, b;
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        default: r = v; g = p; b = q;
    }
    out.r = r * 255;
    out.g = g * 255;
    out.b = b * 255;
    out.a = 255;
    return out;
};

// A palette colour {h, s, v}, in any form jim.colour.fraction accepts, as whole-number red, green and blue.
jim.colour.toRgb = function (hsv) {
    "use strict";
    var c = jim.colour.hsvToRgb(parseFloat(hsv.h), jim.colour.fraction(hsv.s), jim.colour.fraction(hsv.v), {});
    return {
        r: Math.round(Math.min(255, Math.max(0, c.r))),
        g: Math.round(Math.min(255, Math.max(0, c.g))),
        b: Math.round(Math.min(255, Math.max(0, c.b))),
        a: 255
    };
};

namespace("jim.palette.colourNode");
var nodeid = 0;
jim.palette.colourNode.create = function(hsv, position) {
    "use strict";
    nodeid +=1;
    return {
        id:nodeid,
        hsv:hsv,
        rgb:jim.colour.toRgb(hsv),
        position:position,
        setPosition: function (p) {
            this.position = p;
        },
        setColour: function (_hsv) {
            this.hsv = _hsv;
            this.rgb = jim.colour.toRgb(_hsv);
        }
    };
};

namespace("jim.palette");
jim.palette.create = function () {
    "use strict";
    var colourNode = jim.palette.colourNode.create;
    var hsv = function (h, s, v){ return { h: h, s: s, v: v }; };
    var orange = hsv(46.111111111111114, 0.888888888888889, 0.9529411764705882);   // rgb(243, 193, 27)
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
        return jim.colour.hsvToRgb(h, interpolate(from.s, to.s, fraction), interpolate(from.v, to.v, fraction), out);
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

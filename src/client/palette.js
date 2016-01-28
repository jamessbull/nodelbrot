namespace("jim.palette");
jim.palette.create = function () {
    "use strict";
    var pal = [];
    var hsv = function (h, s, v){ return { h: h, s: s, v: v }; };

    var orange = hsv(39,100,100);
    var gold = hsv(51,100,100);
    var yellow = hsv(60,100,100);
    var blue = hsv(250,100,100);
    var cyan = hsv(170,100,100);

    var colourNode = function(hsv, position) {
        return {
            hsv:hsv,
            position:position,
            before: function (n) { return this.position <= n; },
            after: function (n) {return this.position >= n;}
        };
    };
    var interpolate = jim.interpolator.create().interpolate;

    var colourNodes = {
        nodes:[colourNode(orange,0), colourNode(gold, 0.5), colourNode(yellow, 0.85), colourNode(cyan,0.85),colourNode(blue,1)],
        from: function (n) {
            var nodeToReturn = {};
            this.nodes.forEach( function(node) {
                if (node.before(n)) {
                    nodeToReturn = node;
                }
            });
            return nodeToReturn;
        },
        to: function (n) {
            var nodeToReturn = "unset";
            this.nodes.forEach(function (node) {
                if(node.after(n) && nodeToReturn === "unset"){
                    nodeToReturn = node;
                }
            });
            return nodeToReturn;
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


    // O.K. So to display colours for selection I need a colour wheel
    // to do a colour wheel I need to do all pixels myself
    // go through every pixel in the canvas
    // if its not in the circle then it is white
    // if it is in the circle then depending on the angle from vertical that determines the hue. In the hsv model an angle between 0 and 360 is the hue.
    // the closer to the centre the lower the saturation
    return {
        colourAt: function (number) {
            var currentColour =  colourNodes.at(number).toRgb();
            currentColour.a = 255;
            return currentColour;
        },
        toArray: function () { return pal; }
    };
};

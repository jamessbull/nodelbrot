describe("The mandelbrot set", function () {
    "use strict";

    var notifier = {notify: function () {}};

    it("can take several iterations to escape", function () {
        var mandelbrotCoord = {x: -0.3, y: -0.9},
            escape = jim.mandelbrot.escape.create(),
            point = jim.mandelbrot.point.create(mandelbrotCoord);

        escape.calculate(point);
        expect(point.iterations).toBe(1);
        expect(point.escaped).toBeFalsy();
        expect(point.x).toBe(-0.3);
        expect(point.y).toBe(-0.9);

        escape.calculate(point);
        expect(point.iterations).toBe(2);
        expect(point.escaped).toBeFalsy();
        expect(point.x).toBe(-1.02);
        expect(point.y).toBe(-0.36);

        escape.calculate(point);
        expect(point.iterations).toBe(3);
        expect(point.escaped).toBeFalsy();
        expect(point.x).toBe(0.6108);
        expect(point.y).toBe(-0.16560000000000008);

        escape.calculate(point);
        expect(point.iterations).toBe(4);
        expect(point.escaped).toBeFalsy();
        expect(point.x).toBe(0.04565328000000002);
        expect(point.y).toBe(-1.10229696);

        escape.calculate(point);
        expect(point.iterations).toBe(5);
        expect(point.escaped).toBeFalsy();
        expect(point.x).toBe(-1.5129743660504835);
        expect(point.y).toBe(-1.0006469435160577);

    });

    it("should create a colour palette array where every element is a colour", function () {
        var pal = jim.palette.create();

        pal.toArray().forEach(function (colour) {
            expect(colour.hasOwnProperty('r')).toBe(true);
            expect(colour.hasOwnProperty('g')).toBe(true);
            expect(colour.hasOwnProperty('b')).toBe(true);
            expect(colour.hasOwnProperty('a')).toBe(true);
        });
    });

    it("should execute 250000 times in 8 ms", function () {
        var escape = jim.mandelbrot.escape.create(),
            i = 0,
            j = 0,
            stopwatch = timer.create(),
            mb;

        stopwatch.start();
        mb = jim.mandelbrot.state.create(500, 500);
        stopwatch.stop();
        console.log("initialisation took " + stopwatch.elapsed() + "ms");

        stopwatch.start();
        for (i; i < 500; i += 1) {
            for (j; j < 500; j += 1) {
                escape.calculate(mb.at(i, j));
            }
            j = 0;
        }
        stopwatch.stop();
        console.log("calling the mandelbrot function 250000 times took " + stopwatch.elapsed() + "ms");
    });

    it("should build initial state for mandelbrot calculation", function () {
        var mb = jim.mandelbrot.state.create(500, 500);

        expect(mb.at(0, 0).coord.x).toBe(-2.5);
        expect(mb.at(0, 0).coord.y).toBe(-1);

        expect(mb.at(0, 0).x).toBe(0);
        expect(mb.at(0, 0).y).toBe(0);
        expect(mb.at(0, 0).iterations).toBe(0);
        expect(mb.at(0, 0).escaped).toBeFalsy();

        expect(mb.at(499, 499).coord.x).toBe(1);
        expect(mb.at(499, 499).coord.y).toBe(1);

        expect(mb.at(499, 499).x).toBe(0);
        expect(mb.at(499, 499).y).toBe(0);
        expect(mb.at(499, 499).iterations).toBe(0);
        expect(mb.at(499, 499).escaped).toBeFalsy();
    });

    it("should take a state and an escape and a palette and return a func that takes x and y " +
        "the func should get the x,y val from state and call escape with it" +
        "the colour function should then be called on the x,y state val and returned", function () {
            var escape = jim.mandelbrot.escape.create(notifier),
                state = jim.mandelbrot.state.create(500, 500),
                palette = jim.palette.create(),
                mbSet = jim.mandelbrot.set.create(state, escape, palette),
                col;

            col = mbSet.drawFunc(12, 45);
            console.log(col);
            expect(col.r).toBe(255);
            expect(col.g).toBe(255);
            expect(col.b).toBe(255);

            col = mbSet.drawFunc(300, 250);
            expect(col.r).toBe(0);
            expect(col.g).toBe(0);
            expect(col.b).toBe(0);
        });

    it("draws each segment in turn", function () {
        var result = "foo",
            seg1 = jim.segment.create(200, 200, 10, 10,  function () {
                result = "seg1";
                return jim.colour.create(1, 2, 3, 4);
            }),
            seg2 = jim.segment.create(200, 200, 10, 10,  function () {
                result = "seg2";
                return jim.colour.create(9, 100, 9, 255);
            }),
            segs = [seg1, seg2],
            image = {draw: function () {}},
            screen = jim.screen.create({segments: segs, image: image});

        screen.draw();
        expect(result).toBe("seg1");
        screen.draw();
        expect(result).toBe("seg2");

        screen.draw();
        expect(result).toBe("seg1");
        screen.draw();
        expect(result).toBe("seg2");
    });

    it("creates segments based on a size", function () {
        var segs = jim.segment.createSegments(600, 600, 3, function () {
            return jim.colour.create(67, 0, 0, 255);
        });

        expect(segs[0].size()).toBe(200);
        expect(segs[0].xOffset()).toBe(0);
        expect(segs[0].yOffset()).toBe(0);

        expect(segs[1].size()).toBe(200);
        expect(segs[1].xOffset()).toBe(200);
        expect(segs[1].yOffset()).toBe(0);

        expect(segs[3].size()).toBe(200);
        expect(segs[3].xOffset()).toBe(0);
        expect(segs[3].yOffset()).toBe(200);
    });

    it("should calculate a colour based on the current state of the point calculation", function () {
        var p = jim.mandelbrot.point.create(jim.coord.create(0.1, 0.1)),
            palette = jim.palette.create(),
            colours = jim.colourCalculator.create(palette),
            colour,
            histogram = {percentEscapedBy: function (n) {return 0.2; }};

        p.iterations = 5;
        p.x = 3.5;
        p.y = 3;

        spyOn(palette, "colourAt").andReturn(jim.colour.create(8, 8, 8, 255));
        colour = colours.forPoint(p, histogram);

        expect(palette.colourAt).toHaveBeenCalledWith(0.2);

        expect(colour.r).toBe(8);
        expect(colour.g).toBe(8);
        expect(colour.b).toBe(8);

    });
//so I have a histogram and a palette and a colour calculator
// calc takes histogram and palette
// histogram gives me a value between 0 and 1 I use this to get a colour
// palette responsible for returning a colour between two other colours
});

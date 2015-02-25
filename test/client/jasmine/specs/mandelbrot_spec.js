describe("The mandelbrot set", function () {
    "use strict";

    var notifier = {notify: function () {}};

    it("can take several iterations to escape", function () {
        var mandelbrotCoord = {x: -0.3, y: -0.9},
            escape = jim.mandelbrot.escape.create(notifier),
            state = {x: 0, y: 0, iterations: 0, escaped: false};

        escape.calculate(mandelbrotCoord, state);
        expect(state.iterations).toBe(1);
        expect(state.escaped).toBeFalsy();
        expect(state.x).toBe(-0.3);
        expect(state.y).toBe(-0.9);

        escape.calculate(mandelbrotCoord, state);
        expect(state.iterations).toBe(2);
        expect(state.escaped).toBeFalsy();
        expect(state.x).toBe(-1.02);
        expect(state.y).toBe(-0.36);

        escape.calculate(mandelbrotCoord, state);
        expect(state.iterations).toBe(3);
        expect(state.escaped).toBeFalsy();
        expect(state.x).toBe(0.6108);
        expect(state.y).toBe(-0.16560000000000008);

        escape.calculate(mandelbrotCoord, state);
        expect(state.iterations).toBe(4);
        expect(state.escaped).toBeFalsy();
        expect(state.x).toBe(0.04565328000000002);
        expect(state.y).toBe(-1.10229696);

        escape.calculate(mandelbrotCoord, state);
        expect(state.iterations).toBe(5);
        expect(state.escaped).toBeFalsy();
        expect(state.x).toBe(-1.5129743660504835);
        expect(state.y).toBe(-1.0006469435160577);

    });

    it("should create a colour palette array where every element is a colour", function () {
        var pal = jim.mandelbrot.colour.palette.create();

        pal.forEach(function (colour) {
            colour.hasOwnProperty('red');
            colour.hasOwnProperty('green');
            colour.hasOwnProperty('blue');
            colour.hasOwnProperty('alpha');
        });
    });

    it("should return a colour palette i or wrap if beyond the end of the palette", function () {
        var palette = jim.mandelbrot.colour.palette.create(),
            colour;

        colour = palette.intoColours({iterations: 0});
        expect(colour.red).toBe(palette[0].red);
        expect(colour.green).toBe(palette[0].green);
        expect(colour.blue).toBe(palette[0].blue);

        colour = palette.intoColours({iterations: 10});
        expect(colour.red).toBe(palette[10].red);
        expect(colour.green).toBe(palette[10].green);
        expect(colour.blue).toBe(palette[10].blue);

        colour = palette.intoColours({iterations: palette.length});
        expect(colour.red).toBe(palette[0].red);
        expect(colour.green).toBe(palette[0].green);
        expect(colour.blue).toBe(palette[0].blue);
    });

    it("should execute 250000 times in 8 ms", function () {
        var escape = jim.mandelbrot.escape.create(notifier),
            i = 0,
            j = 0,
            coord = jim.mandelbrot.coordTranslator.create(500, 500, -2.5, 1, -1, 1),
            stopwatch = timer.create(),
            mb;

        stopwatch.start();
        mb = jim.mandelbrot.state.create(500, 500, coord.func);
        stopwatch.stop();
        console.log("initialisation took " + stopwatch.elapsed() + "ms");

        stopwatch.start();
        for (i; i < 500; i += 1) {
            for (j; j < 500; j += 1) {
                escape.calculate(mb[i][j].coord, mb[i][j].calc);
            }
            j = 0;
        }
        stopwatch.stop();
        console.log("calling the mandelbrot function 250000 times took " + stopwatch.elapsed() + "ms");
    });

    it("should build initial state for mandelbrot calculation", function () {
        var coord = jim.mandelbrot.coordTranslator.create(500, 500, -2.5, 1, -1, 1),
            mb = jim.mandelbrot.state.create(500, 500, coord.func);

        expect(mb[0][0].coord.x).toBe(-2.5);
        expect(mb[0][0].coord.y).toBe(-1);

        expect(coord.func(0, 0).x).toBe(-2.5);
        expect(coord.func(0, 0).y).toBe(-1);

        expect(mb[0][0].calc.x).toBe(0);
        expect(mb[0][0].calc.y).toBe(0);
        expect(mb[0][0].calc.iterations).toBe(0);
        expect(mb[0][0].calc.escaped).toBeFalsy();


        expect(coord.func(499, 499).x).toBe(1);
        expect(coord.func(499, 499).y).toBe(1);

        expect(mb[499][499].coord.x).toBe(1);
        expect(mb[499][499].coord.y).toBe(1);

        expect(mb[499][499].calc.x).toBe(0);
        expect(mb[499][499].calc.y).toBe(0);
        expect(mb[499][499].calc.iterations).toBe(0);
        expect(mb[499][499].calc.escaped).toBeFalsy();
    });

    it("should take a state and an escape and a palette and return a func that takes x and y " +
        "the func should get the x,y val from state and call escape with it" +
        "the colour function should then be called on the x,y state val and returned", function () {
            var escape = jim.mandelbrot.escape.create(notifier),
                state = jim.mandelbrot.state.create(500, 500, jim.mandelbrot.coordTranslator.create(500, 500, -2.5, 1, -1, 1).func),
                palette = jim.mandelbrot.colour.palette.create(),
                mbSet = jim.mandelbrot.set.create(state, escape, palette),
                col;

            col = mbSet.drawFunc(12, 45);
            console.log(col);
            expect(col.red).toBe(255);
            expect(col.green).toBe(10);
            expect(col.blue).toBe(10);

            col = mbSet.drawFunc(300, 250);
            expect(col.red).toBe(0);
            expect(col.green).toBe(0);
            expect(col.blue).toBe(0);
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
});

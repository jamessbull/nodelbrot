describe("The mandelbrot set", function () {
    "use strict";

    it("can take several iterations to escape", function () {
        var mandelbrotCoord = {x: -0.3, y: -0.9},
            escape = mandelbrot.escape.create(),
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

    it("should create a colour palette", function () {
        var pal = mandelbrot.colour.palette.create();
        expect(pal.length).toBe(5);

        expect(pal[0].red).toBe(0);
        expect(pal[0].green).toBe(0);
        expect(pal[0].blue).toBe(0);
        expect(pal[0].alpha).toBe(255);

        expect(pal[1].red).toBe(255);
        expect(pal[1].green).toBe(0);
        expect(pal[1].blue).toBe(0);
        expect(pal[1].alpha).toBe(255);

        expect(pal[2].red).toBe(0);
        expect(pal[2].green).toBe(255);
        expect(pal[2].blue).toBe(0);
        expect(pal[2].alpha).toBe(255);

        expect(pal[3].red).toBe(0);
        expect(pal[3].green).toBe(0);
        expect(pal[3].blue).toBe(255);
        expect(pal[3].alpha).toBe(255);

        expect(pal[4].red).toBe(255);
        expect(pal[4].green).toBe(255);
        expect(pal[4].blue).toBe(255);
        expect(pal[4].alpha).toBe(255);
    });

    it("should take a palette and trans form iterations to colours", function () {
        var mandelbrotPalette = mandelbrot.colour.palette.create(),
            mandelbrotColours;
        mandelbrotColours = mandelbrotPalette.intoColours([{iterations: 0}, {iterations: 2}, {iterations: 11}]);
        expect(mandelbrotColours.length).toBe(3);

        expect(mandelbrotColours[0].red).toBe(0);
        expect(mandelbrotColours[0].green).toBe(0);
        expect(mandelbrotColours[0].blue).toBe(0);

        expect(mandelbrotColours[1].red).toBe(0);
        expect(mandelbrotColours[1].green).toBe(255);
        expect(mandelbrotColours[1].blue).toBe(0);

        expect(mandelbrotColours[2].red).toBe(255);
        expect(mandelbrotColours[2].green).toBe(0);
        expect(mandelbrotColours[2].blue).toBe(0);
    });

    it("should execute 250000 times in 8 ms", function () {
        var escape = mandelbrot.escape.create(),
            i = 0,
            j = 0,
            coord = mandelbrot.coordTranslator.create(500),
            stopwatch = timer.create(),
            mb;

        stopwatch.start();
        mb = mandelbrot.state.create(500, coord);
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
        var coord = mandelbrot.coordTranslator.create(500),
            mb = mandelbrot.state.create(500, coord);

        expect(mb[0][0].coord.x).toBe(-2.5);
        expect(mb[0][0].coord.y).toBe(-1);

        expect(mb[0][0].calc.x).toBe(0);
        expect(mb[0][0].calc.y).toBe(0);
        expect(mb[0][0].calc.iterations).toBe(0);
        expect(mb[0][0].calc.escaped).toBeFalsy();

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
            var escape = mandelbrot.escape.create(),
                state = mandelbrot.state.create(500, mandelbrot.coordTranslator.create(500)),
                palette = mandelbrot.colour.palette.create(),
                mbSet = mandelbrot.set.create(state, escape, palette),
                col;

            col = mbSet(12, 45);
            console.log(col);
            expect(col.red).toBe(0);
            expect(col.green).toBe(0);
            expect(col.blue).toBe(0);

            col = mbSet(300, 250);
            expect(col.red).toBe(0);
            expect(col.green).toBe(0);
            expect(col.blue).toBe(0);
        });

    it("draws each segment in turn", function () {
        var result = "foo",
            seg1 = jim.segment.create(200, 10, 10,  function () {
                result = "seg1";
                return jim.colour.create(1, 2, 3, 4);
            }),
            seg2 = jim.segment.create(200, 10, 10,  function () {
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

});

var nodelbrot = require("nodelbrot.js"),
    routing = require("routing/nodelbrotRouter.js"),
    httpStub = require("server/stubs/http.js"),
    router = routing.create();

describe("The nodelbrot application", function () {
    "use strict";
    it("should have index route", function () {
        var app = nodelbrot.create({portNo: 4567, router: router, http: httpStub}),
            indexRoute = app.router.routes().filter(function (route) { return route.url === "/"; })[0];

        expect(indexRoute.url).toBe("/");
        expect(router.routerName).toBe("nodelbrot");
    });
    it("should contain routes for everything in source/client", function (done) {
        var mandelRoute = router.routeFor("/js/mandelbrot.js");
        expect(mandelRoute).toBeDefined();
        expect(mandelRoute.url).toBe("/js/mandelbrot.js");
        mandelRoute.execute(function (content) {
            expect(content).toMatch("mandelbrot");
            done();
        });
    });
    it("should contain routes for everything in test/client/jasmine/specs", function (done) {
        var mandelRoute = router.routeFor("/specs/mandelbrot_spec.js");
        expect(mandelRoute).toBeDefined();
        expect(mandelRoute.url).toBe("/specs/mandelbrot_spec.js");
        mandelRoute.execute(function (content) {
            expect(content).toMatch("The mandelbrot set");
            done();
        });
    });
});
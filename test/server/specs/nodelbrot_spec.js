var nodelbrot = require("nodelbrot.js"),
    routing = require("routing/nodelbrotRouter.js");

describe("The nodelbrot application", function () {
    "use strict";
    it("should have index route", function () {
        var httpStub = require("server/stubs/http.js"),
            router = routing.create(),
            app = nodelbrot.create({portNo: 4567, router: router, http: httpStub}),
            indexRoute = app.router.routes().filter(function (route) { return route.url === "/"; })[0];

        expect(indexRoute.url).toBe("/");
        //expect(indexRoute.execute.handlerName).toBe("index");
        expect(router.routerName).toBe("nodelbrot");
    });
});
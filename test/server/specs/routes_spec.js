var routes = require("routing/routes.js"),
    route = require("routing/route.js");

describe("The routes", function () {
    "use strict";
    it("should map a url to a name", function () {
        var testRoutes = routes.create();

        testRoutes.add(route.create("/", function () {  }));
        expect(testRoutes.routeFor("/").url).toBe("/");
    });
});
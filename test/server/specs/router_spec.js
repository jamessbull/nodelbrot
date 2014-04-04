var routing = require("routing/router.js");

describe("The router", function () {
    "use strict";
    it("should map a request to an route with the correct name", function () {
        var router = routing.create(),
            baseRequest = {url: "/"},
            otherRequest = {url: "/otherAction"},
            response = {result: "Not called"};

        router.addRoute("/", function (request, response) { response.result = "base"; });
        router.addRoute("/otherAction", function (request, response) { response.result = "otherAction"; });

        expect(response.result).toBe("Not called");

        router(baseRequest, response);
        expect(response.result).toBe("base");

        router(otherRequest, response);
        expect(response.result).toBe("otherAction");
    });
});
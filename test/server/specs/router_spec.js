var routing = require("routing/router.js"),
    router = routing.create(),
    req = function (url) {
        "use strict";
        return {url: url};
    },
    resp = function () {
        "use strict";
        return {result: "Not called", statusCode: "200"};
    };

describe("The router", function () {
    "use strict";
    it("should map a request to an route with the correct name", function () {
        var response = resp();

        router.addRoute("/", function (request, response) { response.result = "base"; });
        router.addRoute("/otherAction", function (request, response) { response.result = "otherAction"; });

        expect(response.result).toBe("Not called");

        router(req("/"), response);
        expect(response.result).toBe("base");

        router(req("/otherAction"), response);
        expect(response.result).toBe("otherAction");
    });

    it("should politely 404 when something is not found", function () {
        var response = resp();
        router(req("/bananas"), response);
        expect(response.statusCode).toBe(404);
    });
});
var routing = require("routing/router.js"),
    router = routing.create(),
    result = "Not called",
    end,
    req = function (url) {
        "use strict";
        return {url: url};
    },
    resp = function () {
        "use strict";
        return {
            result: "Not called",
            statusCode: "200",
            write: function (content) { result = content; },
            end: function () { end = true; }
        };
    };


describe("The router", function () {
    "use strict";
    it("should map a request to an route with the correct name", function () {
        var response = resp();

        router.addRoute("/", function (callback) { callback("base"); });
        router.addRoute("/otherAction", function (callback) { callback("otherAction"); });

        expect(result).toBe("Not called");

        router(req("/"), response);
        expect(result).toBe("base");

        router(req("/otherAction"), response);
        expect(result).toBe("otherAction");
        expect(end).toBeTruthy();
    });

    it("should politely 404 when something is not found", function () {
        var response = resp();
        router(req("/bananas"), response);
        expect(response.statusCode).toBe(404);
        expect(end).toBeTruthy();
    });
});
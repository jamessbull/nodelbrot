var webServer = require("webserver.js"),
    httpStub = require("server/stubs/http.js").create();

describe("The http server", function () {
    "use strict";
    it("should start serving on the desired port", function () {
        var server = webServer.create(httpStub, 8095);
        server.start();
        expect(httpStub.createCalled()).toBe(1);
        expect(httpStub.listeningOn()).toBe(8095);
    });

    it("should use the supplied function", function () {
        var serverFunction = function () { return "testServerFunction"; };
        webServer.create(httpStub, 8095, serverFunction);
        expect(httpStub.callSuppliedFunction()).toBe("testServerFunction");
    });
});


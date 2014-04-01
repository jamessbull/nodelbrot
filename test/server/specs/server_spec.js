var webServer = require("webserver.js"),
    httpStub = require("server/stubs/http.js");

describe("The http server", function () {
    "use strict";
    it("should start the server on the desired port", function () {
        var server = webServer.create(httpStub, 8095);
        server.start();
        expect(httpStub.createCalled()).toBeTruthy();
        expect(httpStub.listeningOn()).toBe(8095);
    });
});

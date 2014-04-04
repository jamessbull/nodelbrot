var webServer = require("webserver.js"),
    httpStub = require("server/stubs/http.js").create();


describe("The http server", function () {
    "use strict";
    it("should start serving on the desired port", function () {
        var server = webServer.create({ http: httpStub, portNo: 8095, router: {}});
        server.start();
        expect(httpStub.createCalled()).toBe(1);
        expect(httpStub.listeningOn()).toBe(8095);
    });

    it("should use the supplied function", function () {
        var serverFunction = function () { return "testServerFunction"; };
        webServer.create({ http: httpStub, portNo: 8095, router: serverFunction});
        expect(httpStub.callSuppliedFunction()).toBe("testServerFunction");
    });

    it("should return the supplied function", function () {
        var serverFunction = function () { return "testServerFunction"; },
            server = webServer.create({ http: httpStub, portNo: 8095, router: serverFunction});
        expect(server.serverFunction).toBe(serverFunction);
    });
});


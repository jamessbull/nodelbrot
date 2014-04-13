var server = require("webserver.js"),
    router = require("routing/nodelbrotRouter.js");

exports.create = function (args) {
    "use strict";
    var defaults = {
        portNo: 8090,
        http: require("http"),
        router: router.create()
    },
        serverArgs,
        webserver;
    if (arguments.length) {
        serverArgs = args;
    } else {
        serverArgs = defaults;
    }

    return {
        start: function () {
            webserver = server.create(serverArgs);
            webserver.start();
        },
        stop: function () {
            webserver.stop();
        },
        router: serverArgs.router
    };
};


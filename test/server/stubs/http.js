exports.create = function () {
    "use strict";
    var createCalled = 0,
        portNo = 0,
        suppliedFunction;

    return {
        createServer: function (callback) {
            suppliedFunction = callback;
            createCalled += 1;
            return {
                listen: function (portNumber) { portNo = portNumber; },
                close: function (callback) {}
            };
        },
        listeningOn: function () { return portNo; },
        createCalled: function () { return createCalled; },
        callSuppliedFunction: function () { return suppliedFunction(); }
    };
};
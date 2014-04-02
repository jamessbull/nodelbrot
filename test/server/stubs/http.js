var createCalled = false,
    portNo = 0,
    suppliedFunction;
exports.createServer = function (callback) {
    "use strict";
    suppliedFunction = callback;
    createCalled = true;
    return {
        listen: function (portNumber) { portNo = portNumber; },
        close: function (callback) {}
    };
};
exports.listeningOn = function () {
    "use strict";
    return portNo;
};
exports.createCalled = function () {
    "use strict";
    return createCalled;
};
exports.callSuppliedFunction = function () {
    "use strict";
    return suppliedFunction();
};

var createCalled = false,
    portNo = 0;
exports.createServer = function (callback) {
    "use strict";
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

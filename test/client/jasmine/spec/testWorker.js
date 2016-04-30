onmessage = function (message) {
    "use strict";
    var response = {};
    response.action = "Eaten";
    response.name = message.data.type;
    postMessage(response);
};
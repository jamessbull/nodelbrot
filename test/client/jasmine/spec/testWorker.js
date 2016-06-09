onmessage = function (message) {
    "use strict";

    var progressReport = {};

    progressReport.event = {};
    progressReport.type = "progressReport";
    progressReport.event.msg = "Partially eaten";
    postMessage(progressReport);

    var response = {};
    response.type = message.data.type;
    response.result = {};
    response.result.action = "Eaten";
    response.id = message.data.id;
    response.result.chunkComplete = true;
    postMessage(response);
};
exports.create = function (url, action) {
    "use strict";
    var executeFunction = function (request, response) { action(request, response); };
    executeFunction.handlerName = action.handlerName;
    return {
        url: url,
        execute: executeFunction
    };
};

exports.create = function (url, action) {
    "use strict";
    return {
        url: url,
        execute: action
    };
};

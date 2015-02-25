var namespace = function (name) {
    "use strict";
    var parts = name.split("."), partial = window;
    parts.forEach(function (part) {
        if (partial[part] === undefined) {
            partial[part] = {};
        }
        partial = partial[part];
    });
};
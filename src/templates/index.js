exports.create = function () {
    "use strict";
    var template =
        '<html> \
            <head> \
                <title>Hello</title> \
            </head> \
            <body> \
                {{{ body }}} \
            </body> \
        </html>';
    return template;
};

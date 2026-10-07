describe("client scripts", function () {
    "use strict";
    // Browsers make every element id a global variable, so code can use an element without being given
    // it, and break when the element is renamed. Scripts may only use these undeclared globals.
    var allowed = ["window", "document", "self", "jim", "namespace", "events", "on", "nodeid", "Math", "JSON", "Object",
        "Array", "Number", "String", "Boolean", "Date", "Error", "Uint8Array", "Uint32Array", "Float64Array",
        "Uint8ClampedArray", "ImageData", "Worker", "navigator", "location", "setTimeout", "clearTimeout", "setInterval",
        "clearInterval", "console", "parseInt", "parseFloat", "isFinite", "isNaN", "encodeURI", "decodeURI", "URL",
        "postMessage", "importScripts", "onmessage", "performance", "arguments", "undefined", "NaN", "Infinity"];

    it("should not use undeclared globals, such as element ids", function () {
        var fs = require("fs");
        var path = require("path");
        var UglifyJS = require("uglify-js");
        var dir = path.join(__dirname, "../../../../src/client");
        var found = [];
        fs.readdirSync(dir, {recursive: true}).filter(function (f) { return f.endsWith(".js"); }).forEach(function (file) {
            var ast = UglifyJS.parse(fs.readFileSync(path.join(dir, file), "utf8"));
            ast.figure_out_scope();
            var globals = ast.globals;
            var each = globals.each ? globals.each.bind(globals) : function (fn) { globals.forEach(fn); };
            each(function (definition, name) {
                if (allowed.indexOf(name) === -1) {
                    found.push(file + ": " + name);
                }
            });
        });
        expect(found).toEqual([]);
    });
});

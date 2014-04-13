exports.create = function () {
    "use strict";
    var fs = require("fs"),
        template = require("view/template.js").create,
        head = function (files) {
            var head = "";
            head += '<title>Jasmine Tests</title>';
            files.forEach(function (file) {
                head += '<script src="/specs/' + file + '">';
            });
            return head;
        },
        jasminePage = function (head) {
            return template("html", {head: head + "I am head", body: "I am body"});
        };
    return function (request, response) {
        fs.readdir("test/client/jasmine/specs", function (err, files) {
            jasminePage(head(files)).renderTo(function (contents) {
                console.log(contents);
                response.write(contents);
                response.end();
            });
        });
    };
};

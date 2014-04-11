exports.create = function (name, context) {
    "use strict";
    var fs = require("fs"),
        hbl = require("handlebars"),
        render = function (contents) { return hbl.compile(contents)(context); },
        isTemplate = function (obj) { return context[obj].hasOwnProperty("renderTo"); },
        allRendered = function (obj) { return Object.keys(obj).every(function (prop) { return !isTemplate(prop); }); },
        renderWhenReady = function (content, response, callback, callback2) {
            var rendered;
            if (allRendered(context)) {
                rendered = render(content);
                if (callback) {
                    callback(rendered);
                } else {
                    response.write(rendered);
                }
                if (callback2) {
                    callback2();
                }
            }
        };
    return {
        renderTo: function (response, callback, callback2) {
            var filename = "src/view/templates/" + name + ".hbl";
            fs.readFile(filename,  { encoding: 'utf8' }, function (err, content) {
                Object.keys(context).forEach(function (prop) {
                    if (isTemplate(prop)) {
                        context[prop].renderTo(response, function (renderedTemplate) {
                            context[prop] =  renderedTemplate;
                            renderWhenReady(content, response, callback, callback2);
                        });
                    }
                });
                renderWhenReady(content, response, callback, callback2);
            });
        }
    };
}


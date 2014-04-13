exports.create = function (name, context) {
    "use strict";
    var fs = require("fs"),
        hbl = require("handlebars"),
        templateComplete,
        templateContents,
        renderTemplateIfContextResolved = function () {
            if (templatesInContext().length === 0) {
                var renderedTemplate = hbl.compile(templateContents)(context);
                templateComplete(renderedTemplate);
            }
        },
        templatesInContext = function () {
            return Object.keys(context).filter(function (key) {
                return context[key].hasOwnProperty("renderTo");
            });
        },
        renderSubTemplate = function (key) {
            context[key].renderTo(function (renderedTemplate) {
                context[key] =  renderedTemplate;
                renderTemplateIfContextResolved();
            });
        },
        renderAll = function (err, content) {
            templateContents = content;
            renderTemplateIfContextResolved();
            templatesInContext().forEach(renderSubTemplate);
        };

    return {
        renderTo: function (callback) {
            templateComplete = callback;
            var filename = "src/view/templates/" + name + ".hbl";
            fs.readFile(filename,  { encoding: 'utf8' }, renderAll);
        }
    };
};
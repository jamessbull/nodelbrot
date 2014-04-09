var baseTemplate = function (name) {
    "use strict";
    var templateFileName = name,
        templates = {},
        contextEntries = [];
    return {
        context: function () {
            var context = {};
            contextEntries.forEach(function (entry) {
                context[entry.name] = entry.template.render(templates);
            });
            return context;
        },
        render: function (templateSet) {
            templates = templateSet;
            return templates[templateFileName](this.context());
        },
        add: function (name, template) {
            contextEntries.push({name: name, template: template});
        },
        name: name
    };
};
exports.base = baseTemplate;
exports.html = function (name, head, body) {
    "use strict";
    var template = baseTemplate(name);
    template.add("head", head);
    template.add("body", body);
    return template;
};


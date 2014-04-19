exports.create = function (driver, by, baseUrl) {
    "use strict";
    var getElement = function (callback, by) {
        var element = driver.findElement(by);
        element.then(function (element) {
            callback(element);
        }, function () {
            callback(undefined);
        });
    },
        getElements = function (by, callback) {
            var elements = driver.findElements(by);
            elements.then(function (elements) {
                callback(elements);
            }, function () {
                callback([]);
            });
        },
        withElementText = function (element, callback) {
            element.getText().then(function (text) {
                callback(text);
            });
        };
    return {
        open: function () {
            driver.get(baseUrl + "/jasmine");
        },
        title: function (assertion) {
            driver.getTitle().then(function (title) {
                assertion(title);
            });
        },
        passingAlert: function (assertion) {
            getElement(assertion, by.className("passingAlert"));
        },
        testFailures: function (callback) {
            var messages = [];

            getElements(by.className("specDetail"), function (elements) {
                var collectThenCallBack = function (text) {
                    messages.push(text);
                    if (messages.length === elements.length) {
                        callback(messages);
                    }
                };
                elements.forEach(function (element) { withElementText(element, collectThenCallBack); });
            });
        }
    };
};

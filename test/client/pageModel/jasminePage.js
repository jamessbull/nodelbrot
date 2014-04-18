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
        getElements = function (callback, by) {
            var elements = driver.findElements(by);
            elements.then(function (elements) {
                callback(elements);
            }, function () {
                callback([]);
            });
        };
    return {
        open: function () {
            driver.get(baseUrl + "/jasmine");
        },
        jasmineTestsDiv: function (assertion) {
            driver.findElement(by.tagName("head"))
                .then(function (element) {
                    var thing = element.getText();
                    thing.then(function (text) {
                        assertion(text);
                    });
                }, function () {
                    assertion("jasmine test div not found");
                });
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
            var messages = [],
                failures = function (elements) {
                    elements.forEach(function (element) {
                        element.getText().then(function (text) {
                            messages.push(text);
                            if (messages.length === elements.length) {
                                callback(messages);
                            }
                        });
                    });
                };
            getElements(failures, by.className("specDetail"));
        }
    };
};

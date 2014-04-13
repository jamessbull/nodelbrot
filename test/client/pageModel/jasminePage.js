exports.create = function (driver, by, baseUrl) {
    "use strict";
    return {
        open: function () {
            driver.get(baseUrl + "/jasmine");
        },
        jasmineTestsDiv: function (assertion) {
            driver.findElement(by.tagName("head"))
                .then(function (element) {
                    console.log(element);
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
        }
    };
};

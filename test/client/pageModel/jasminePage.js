exports.create = function (driver, by, baseUrl) {
    "use strict";
    return {
        open: function () {
            driver.get(baseUrl + "/jasmine");
        },
        jasmineTestsDiv: function (assertion) {
            driver.findElement(by.id("jasmineTests")).getText().then(assertion);
        }
    };
};

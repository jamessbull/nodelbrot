exports.frontPageTest = function (driver) {
    "use strict";
    driver.wait(function () {
        return driver.getTitle().then(function (title) {
            return title === 'Hello';
        });
    }, 1000);
}


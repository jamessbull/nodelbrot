// Shows how far through an image export is, as a percentage in target. reportOn starts a new
// width x height image from 0%, and add counts that many more pixels done.
export function createProgressReporter(target) {
    let completedSoFar = 0;
    let totalToComplete = 0;
    return {
        reportOn: function (width, height) {
            totalToComplete = width * height;
            completedSoFar = 0;
            target.innerText = "0%";
        },
        add: function (pixels) {
            completedSoFar += pixels;
            const roundedPercent = Math.round((completedSoFar / totalToComplete) * 100 * 100) / 100;
            target.innerText = roundedPercent + "%";
            if (roundedPercent >= 100) {
                completedSoFar = 0;
            }
        }
    };
}

// Shows the whole seconds since start in target, until stop.
export function createTimeReporter(target) {
    let interval;
    return {
        start: function () {
            const start = Date.now();
            const showTime = () => { target.innerHTML = Math.floor((Date.now() - start) / 1000); };
            showTime();
            interval = setInterval(showTime, 1000);
        },
        stop: function () {
            clearInterval(interval);
        }
    };
}

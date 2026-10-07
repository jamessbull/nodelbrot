// Shows short messages in element, a box over the top of the image, for a few seconds. The element is
// a status region, so screen readers announce the messages too.
export function createNotice(element) {
    let hideTimer;
    return {
        show: function (message) {
            clearTimeout(hideTimer);
            element.textContent = message;
            element.hidden = false;
            hideTimer = setTimeout(() => { element.hidden = true; }, 5000);
        }
    };
}

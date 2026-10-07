// Calls drawFrame(n) on each of the next noOfFrames + 1 animation frames, for n from 0 to noOfFrames,
// and resolves once the last has been drawn.
export function drawFrames(noOfFrames, drawFrame) {
    return new Promise(function (resolve) {
        let n = -1;
        function nextFrame() {
            n += 1;
            if (n <= noOfFrames) {
                drawFrame(n);
                window.requestAnimationFrame(nextFrame);
            } else {
                resolve();
            }
        }
        window.requestAnimationFrame(nextFrame);
    });
}

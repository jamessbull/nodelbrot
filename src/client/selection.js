import { rectangle } from "./geometry.js";

export function createSelection(rect) {
    let area = rectangle(0, 0, 0, 0);
    const proportionateHeight = (w) => (rect.height() / rect.width()) * w;
    return {
        area: function () {return area; },
        inProgress: false,
        begin: function (event) {
            area = rectangle(event.x, event.y, 0, 0);
            this.inProgress = true;
        },
        change: function (event) {
            const xWidth = event.x - area.topLeft().x;
            area.resize(xWidth, proportionateHeight(xWidth));
        },
        end: function (event) {
            const xWidth = event.x - area.topLeft().x;
            area.resize(xWidth, proportionateHeight(xWidth));
            this.inProgress = false;
        },
        show: function (context) {
            if (this.inProgress) {
                //context.strokeStyle = "rgba(0, 0, 0, 0.0)";
                context.clearRect(area.topLeft().x, area.topLeft().y, area.width(), area.height());
            }
        }
    };
}

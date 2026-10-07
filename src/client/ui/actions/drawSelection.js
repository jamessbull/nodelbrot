export function createSelectionDrawer() {

    function drawSelection (i, total, canvas, area) {

        const lines = [
            line({x: area.x , y: area.y }, area.width(), "right", 'white'),
            line({x:area.topRight().x, y: area.topRight().y}, area.height(), "down", 'white'),
            line({x:area.bottomRight().x , y: area.bottomRight().y}, area.width(), "left", 'white'),
            line({x: area.bottomLeft().x , y: area.bottomLeft().y }, area.height(), "up", 'white')
        ];

        const totalLength = (area.width() + area.height()) * 2;
        const percentThrough = i / total;
        let remainingLength = totalLength * percentThrough;

        lines.forEach(function (side) {
            if(Math.abs(side.length) <= remainingLength) {
                remainingLength -= Math.abs(side.length);
            } else {
                side.length = remainingLength;
                remainingLength = 0;
            }
            if (side.length !== 0) {
                drawLine(side, canvas);
            }
        });
    }

    function line(start, length, direction, colour) {
        return {
            direction:direction,
            length:length,
            location: start,
            colour: colour
        };
    }


    function drawLine(segment, canvas) {
        const colours = ['black','gray','white', 'white', 'gray','black'];
        for ( let offset = 0 ; offset < 6; offset +=1) {

            const destination = {x:0, y:0};
            const location = {x: 0, y: 0};
            if (segment.direction === "right") {
                location.x = segment.location.x - offset;
                location.y = segment.location.y - offset;
                destination.x = (segment.location.x + segment.length) + offset;
                destination.y = segment.location.y - offset;
            }
            if (segment.direction === "down") {
                location.x = segment.location.x + offset;
                location.y = segment.location.y - offset;
                destination.x = segment.location.x + offset;
                destination.y = segment.location.y + segment.length + offset;
            }
            if (segment.direction === "left") {
                location.x = segment.location.x - segment.length - offset;
                location.y = segment.location.y +offset;
                destination.x = segment.location.x + offset;
                destination.y = segment.location.y + offset;
            }
            if (segment.direction === "up") {
                location.x = segment.location.x - offset;
                location.y = segment.location.y + offset;
                destination.x = segment.location.x - offset;
                destination.y = segment.location.y - segment.length - offset;
            }
            drawPath(colours[offset], location, destination, canvas);
        }
    }


    function drawPath(colour, start, end, canvas) {
        canvas.getContext('2d').fillStyle = colour;
        const x = start.x;
        const y = start.y;
        let width = end.x - (x - 1);
        let height = end.y - (y - 1);
        if(height === 0) height = 1;
        if(width === 0) width = 1;
        canvas.getContext('2d').fillRect(x, y, width, height);
    }


    return { draw: drawSelection };
}

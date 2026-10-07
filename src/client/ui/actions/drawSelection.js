export function createSelectionDrawer() {

    function drawSelection (i, total, _canvas, _location) {

        const lines = [
            line({x: _location.x , y: _location.y }, _location.width(), "right", 'white'),
            line({x:_location.topRight().x, y: _location.topRight().y}, _location.height(), "down", 'white'),
            line({x:_location.bottomRight().x , y: _location.bottomRight().y}, _location.width(), "left", 'white'),
            line({x: _location.bottomLeft().x , y: _location.bottomLeft().y }, _location.height(), "up", 'white')
        ];

        const totalLength = (_location.width() + _location.height()) * 2;
        const percentThrough = i / total;
        let remainingLength = totalLength * percentThrough;

        lines.forEach(function (line) {
            if(Math.abs(line.length) <= remainingLength) {
                remainingLength -= Math.abs(line.length);
            } else {
                line.length = remainingLength;
                remainingLength = 0;
            }
            if (line.length !== 0) {
                drawLine(line, _canvas);
            }
        });
    }

    function line(_location, _length, _direction, _colour) {
        return {
            direction:_direction,
            length:_length,
            location: _location,
            colour: _colour
        };
    }


    function drawLine(_line, _canvas) {
        const colours = ['black','gray','white', 'white', 'gray','black'];
        for ( let offset = 0 ; offset < 6; offset +=1) {

            const destination = {x:0, y:0};
            const location = {x: 0, y: 0};
            if (_line.direction === "right") {
                location.x = _line.location.x - offset;
                location.y = _line.location.y - offset;
                destination.x = (_line.location.x + _line.length) + offset;
                destination.y = _line.location.y - offset;
            }
            if (_line.direction === "down") {
                location.x = _line.location.x + offset;
                location.y = _line.location.y - offset;
                destination.x = _line.location.x + offset;
                destination.y = _line.location.y + _line.length + offset;
            }
            if (_line.direction === "left") {
                location.x = _line.location.x - _line.length - offset;
                location.y = _line.location.y +offset;
                destination.x = _line.location.x + offset;
                destination.y = _line.location.y + offset;
            }
            if (_line.direction === "up") {
                location.x = _line.location.x - offset;
                location.y = _line.location.y + offset;
                destination.x = _line.location.x - offset;
                destination.y = _line.location.y - _line.length - offset;
            }
            drawPath(colours[offset], location, destination, _canvas);
        }
    }


    function drawPath(_colour, _start, _destination, _canvas) {
        _canvas.getContext('2d').fillStyle = _colour;
        const x = _start.x;
        const y = _start.y;
        let width = _destination.x - (x - 1);
        let height = _destination.y - (y - 1);
        if(height === 0) height = 1;
        if(width === 0) width = 1;
        _canvas.getContext('2d').fillRect(x, y, width, height);
    }


    return { draw: drawSelection };
}

/*
 *
 * @author Yoshiki Vazquez Baeza
 * @copyright Copyright 2013, The Emperor Project
 * @credits Yoshiki Vazquez Baeza
 * @license BSD
 * @version 0.9.3-dev
 * @maintainer Yoshiki Vazquez Baeza
 * @email yoshiki89@gmail.com
 * @status Development
 *
 */

function gestureCallback(frame){
    var gesture;

    // Display Gesture object data
    if (frame.gestures.length > 0) {
        for (var i = 0; i < frame.gestures.length; i++) {
            gesture = frame.gestures[i];
            switch (gesture.type) {
                case "circle":
                    console.log('circle gesture');
                    break;
                case "swipe":
                    console.log('swipe gesture');
                    break;
                case "screenTap":
                case "keyTap":
                    console.log('key tap gesture');
                    _switchColors();
                    break;
                default:
                    console.log("unkown gesture type");
            }
        }
    }

    return;
};

function _switchColors(){
    var checkbox = $("#discreteorcontinuouscolors");
    checkbox.prop('checked', !checkbox.prop('checked'));
    toggleContinuousAndDiscreteColors({'checked':checkbox.prop('checked')});
    _switchColors.counter = 0;
};

// taken from threeleapcontrols
function transform(tipPosition, w, h) {
    var width = 150;
    var height = 150;
    var minHeight = 100;

    var ftx = tipPosition[0];
    var fty = tipPosition[1];
    ftx = (ftx > width ? width - 1 : (ftx < -width ? -width + 1 : ftx));
    fty = (fty > 2*height ? 2*height - 1 : (fty < minHeight ? minHeight + 1 : fty));
    var x = THREE.Math.mapLinear(ftx, -width, width, 0, w);
    var y = THREE.Math.mapLinear(fty, 2*height, minHeight, 0, h);
    return [x, y];
};

// taken from threeleapcontrols
function showCursor(frame, renderer) {
    var hl = frame.hands.length;
    var fl = frame.pointables.length;

    if (hl == 1 && fl == 1) {
        var f = frame.pointables[0];
        var cont = $(renderer.domElement);
        var offset = cont.offset();
        var coords = transform(f.tipPosition, cont.width(), cont.height());
        $("#cursor").css('left', offset.left + coords[0] - (($("#cursor").width() - 1)/2 + 1));
        $("#cursor").css('top', offset.top + coords[1] - (($("#cursor").height() - 1)/2 + 1));
    } else {
        $("#cursor").css('left', -1000);
        $("#cursor").css('top', -1000);
    };
};


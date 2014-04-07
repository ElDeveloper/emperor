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

function handIsClosed(){
    console.log('responding to the callback');

    if ( typeof handIsClosed.counter == 'undefined' ){
        handIsClosed.counter = 0;
    }

    if (handIsClosed.counter > 9){
        var checkbox = $("#discreteorcontinuouscolors");
        checkbox.prop('checked', !checkbox.prop('checked'));
        toggleContinuousAndDiscreteColors({'checked':checkbox.prop('checked')});
        handIsClosed.counter = 0;
    }
    handIsClosed.counter += 1;
}


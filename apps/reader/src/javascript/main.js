
async function onLoad() {
    const webgazer = require("./webgazer")
    //start the webgazer tracker
    document.getElementById('webgazerVideoContainer').style.setProperty('left', '0px');
    webgazer.setVideoViewerSize(320, 240)
    webgazer.setGazeListener(function(data, clock) {
        //   console.log(data); /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
        //   console.log(clock); /* elapsed time in milliseconds since webgazer.begin() was called */
    })

    //Set up the webgazer video feedback.
    var setup = function() {
        //Set up the main canvas. The main canvas is used to calibrate the webgazer.
        var canvas = document.getElementById("plotting_canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
        webgazer.clearData();
    };
    setup();

};

// Set to true if you want to save the data even if you reload the page.
//window.saveDataAcrossSessions = true;
/**
 * window.onbeforeunload = function() {
    const webgazer = require("./webgazer")
    webgazer.end();
}
 */


/**
 * Restart the calibration process by clearing the local storage and reseting the calibration point
 */
function Restart(){
    //document.getElementById("Accuracy").innerHTML = '<a className="navbar-brand mb-0 h1">Not yet Calibrated</a>';
    const webgazer = require("./webgazer")
    webgazer.clearData();
    ClearCalibration();
    PopUpInstruction();
}

module.exports = { Restart, onLoad }
// Find the help modal
var helpModal;

/**
 * Clear the canvas and the calibration button.
 */
function ClearCanvas(){
  document.querySelectorAll('.Calibration').forEach((i) => {
    i.style.setProperty('display', 'none');
  });
  var canvas = document.getElementById("plotting_canvas");
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Show the instruction of using calibration at the start up screen.
 */
function PopUpInstruction(){
  ClearCanvas();
}
/**
  * Show the help instructions right at the start.
  */
function helpModalShow() {
    if(!helpModal) {
      var {Modal} = require('bootstrap');
      helpModal = new Modal(document.getElementById('helpModal'));
    }
    helpModal.show();
}

function calcAccuracy(accuracy_callback) {
    // show modal
    // notification for the measurement process
    const webgazer = require("./webgazer");
    
    // makes the variables true for 5 seconds & plots the points

    const {store_points_variable, stop_storing_points_variable} = require('./precision_store_points');
    const calculatePrecision = require('./precision_calculation');

    store_points_variable(); // start storing the prediction points

    sleep(5000).then(() => {
            stop_storing_points_variable(); // stop storing the prediction points
            var past50 = webgazer.getStoredPoints(); // retrieve the stored points
            var precision_measurement = calculatePrecision(past50);
            //var accuracyLabel = '<a className="navbar-brand h1 mb-0">Accuracy | ' +precision_measurement+ '%</a>';
            //document.getElementById("Accuracy").innerHTML = accuracyLabel; // Show the accuracy in the nav bar.
            swal({
                title: "Su medida de precisión es del " + precision_measurement + "%",
                allowOutsideClick: false,
                buttons: {
                    cancel: "Recalibrar",
                    confirm: true,
                }
            }).then(isConfirm => {
                    if (isConfirm){
                      ClearCanvas();
                      var marker =  document.getElementById("startTextMarker")
                      marker.style.removeProperty('display');
                      marker.className += " animation";
                      document.getElementById('webgazerVideoContainer').style.removeProperty('left')
                      sleep(3000).then(() => {
                        //clear the calibration & hide the last middle button
                        document.getElementById("startTextMarker").style.setProperty('display', 'none');
                        accuracy_callback(precision_measurement, past50)
                        console.log("Weblogger: Callback function executed")
                      })
                    } else {
                        //use restart function to restart the calibration
                        // document.getElementById("Accuracy").innerHTML = '<a className="navbar-brand h1 mb-0">Not yet Calibrated</a>';
                        webgazer.clearData();
                        ClearCalibration();
                        ClearCanvas();
                        ShowCalibrationPoint();
                    }
            });
    });
}

function calPointClick(node, calibration_callback) {
    const id = node.id;

    if (!window.calibrationPoints[id]){ // initialises if not done
      window.calibrationPoints[id]=0;
    }
    window.calibrationPoints[id]++; // increments values

    if (window.calibrationPoints[id]==3){ //only turn to yellow after 5 clicks
        //node.style.setProperty('background-color', 'yellow');
        node.setAttribute('disabled', 'disabled');
        node.setAttribute("src", "/icons/digglet-hole.png");
        node.setAttribute('disabled', 'disabled');
        node.style.setProperty('display', 'none');
        console.log("Weblogger: Element " + node.id + " deleted? " + window.point_ids.splice(window.selected_id, 1))
        window.pointCalibrate++;
        if(window.point_ids.length!=0){
          //window.selected_id = Math.floor(Math.random() * (window.point_ids.length));
          window.selected_id = "Pt" + (window.pointCalibrate + 1);
          console.log(window.point_ids)
          console.log("Weblogger: Selected initial point: " + window.selected_id);
          var element = document.getElementById(window.selected_id);
          //console.log("Weblogger: Selected initial point: " + window.point_ids[window.selected_id])
          //var element = document.getElementById(window.point_ids[window.selected_id]);
          element.setAttribute("src", "/icons/digglet-with-hole.png")
          element.removeAttribute("disabled")
          element.style.removeProperty('display');
        }
    }else if (window.calibrationPoints[id]<3){
        //Gradually increase the opacity of calibration points when click to give some indication to user.
        //var opacity = 0.25*CalibrationPoints[id]+0.25;
        var opacity = 1 - 0.33*window.calibrationPoints[id];
        node.style.setProperty('opacity', opacity);
    }

    //Show the middle calibration point after all other points have been clicked.
    
    /* if (PointCalibrate == 12){
        document.getElementById('Pt6').style.removeProperty('display');
        document.getElementById('Pt6').removeAttribute("disabled")
    } */

    if (window.pointCalibrate >= window.number_of_calibration_points){ // last point is calibrated
      // grab every element in Calibration class and hide them except the middle point.
      document.querySelectorAll('.Calibration').forEach((i) => {
        if(i.id != "PtPrecision"){
          i.style.setProperty('display', 'none');
        }
        else{
          //i.style.setProperty('background-color', 'red');
          i.style.removeProperty('display');
        }
      });
      // clears the canvas
      var canvas = document.getElementById("plotting_canvas");
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

      // Calculate the accuracy
      calibration_callback();
  }
}

/**
 * Load this function when the index page starts.
* This function listens for button clicks on the html page
* checks that all buttons have been clicked 5 times each, and then goes on to measuring the precision
*/
//$(document).ready(function(){
function docLoad() {
  ClearCanvas();
  helpModalShow();
    
    // click event on the calibration buttons
    document.querySelectorAll('.Calibration').forEach((i) => {
        i.addEventListener('click', () => {
            calPointClick(i);
        })
    })
};

//window.addEventListener('load', docLoad);
/**
 * Show the Calibration Points
 */
function ShowCalibrationPoint() {
  window.point_ids = []
  document.querySelectorAll('.Calibration').forEach((i) => {
    if(i.id != "PtPrecision"){
      //i.style.removeProperty('display');
      window.point_ids.push(i.id)
    }
  });
  window.number_of_calibration_points = window.point_ids.length
  // initially hides the middle button
  //document.getElementById('Pt6').style.setProperty('display', 'none');
  //window.selected_id = Math.floor(Math.random() * (window.point_ids.length));
  window.selected_id = "Pt" + (window.pointCalibrate + 1);
  console.log("Weblogger: Selected initial point: " + window.selected_id);
  //console.log("Weblogger: Selected initial point: " + window.point_ids[window.selected_id])
  //var element = document.getElementById(window.point_ids[window.selected_id]);
  var element = document.getElementById(window.selected_id);
  element.setAttribute("src", "/icons/digglet-with-hole.png");
  element.removeAttribute("disabled")
  element.style.removeProperty('display');
  console.log(point_ids)
}

/**
* This function clears the calibration buttons memory
*/
function ClearCalibration(){
  // Clear data from WebGazer

  console.log("Weblogger: Running calibration.js from src folder")

  document.querySelectorAll('.Calibration').forEach((i) => {
    //i.style.setProperty('background-color', 'red');
    /* if(i.id != "PtPrecision"){
      i.setAttribute('disabled', 'disabled');
    }
    else{
      i.style.setProperty('display', 'none');
    } */
    i.style.setProperty('display', 'none');
    i.setAttribute('disabled', 'disabled');
    i.style.setProperty('opacity', '1');
    //i.removeAttribute('disabled');
  });

  window.calibrationPoints = {};
  window.pointCalibrate = 0;
}

// sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

module.exports = {helpModalShow, ShowCalibrationPoint, calPointClick, ClearCalibration, ClearCanvas, calcAccuracy}

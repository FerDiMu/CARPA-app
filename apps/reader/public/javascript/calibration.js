var point_ids=[];
var selected_point_index = 0;

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
  console.log("WEBLOGGER: HE IMPRESO ZORRAAAAAAAAAAS")
  swal({
    title:"Calibration",
    text: "Please click on each of the 9 points on the screen. You must click on each point 5 times till it goes yellow. This will calibrate your eye movements.",
    buttons:{
      cancel: false,
      confirm: true
    }
  }).then(isConfirm => {
    ShowCalibrationPoint();
  });

}
/**
  * Show the help instructions right at the start.
  */
function helpModalShow() {
    if(!helpModal) {
        helpModal = new bootstrap.Modal(document.getElementById('helpModal'))
    }
    helpModal.show();
}

function calcAccuracy() {
    // show modal
    // notification for the measurement process
    const webgazer = require("./webgazer")
    swal({
        title: "Calculating measurement",
        text: "Please don't move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.",
        closeOnEsc: false,
        allowOutsideClick: false,
        closeModal: true
    }).then( () => {
        // makes the variables true for 5 seconds & plots the points
    
        store_points_variable(); // start storing the prediction points
    
        sleep(5000).then(() => {
                stop_storing_points_variable(); // stop storing the prediction points
                var past50 = webgazer.getStoredPoints(); // retrieve the stored points
                var precision_measurement = calculatePrecision(past50);
                var accuracyLabel = "<a>Accuracy | "+precision_measurement+"%</a>";
                //document.getElementById("Accuracy").innerHTML = accuracyLabel; // Show the accuracy in the nav bar.
                swal({
                    title: "Your accuracy measure is " + precision_measurement + "%",
                    allowOutsideClick: false,
                    buttons: {
                        cancel: "Recalibrate",
                        confirm: true,
                    }
                }).then(isConfirm => {
                        if (isConfirm){
                            //clear the calibration & hide the last middle button
                            ClearCanvas();
                        } else {
                            //use restart function to restart the calibration
                            //document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
                            webgazer.clearData();
                            ClearCalibration();
                            ClearCanvas();
                            ShowCalibrationPoint();
                        }
                });
        });
    });
}

function calPointClick(node) {
    const id = node.id;

    if (!window.calibrationPoints[id]){ // initialises if not done
      window.calibrationPoints[id]=0;
    }
    window.calibrationPoints[id]++; // increments values

    if (window.calibrationPoints[id]==4){ //only turn to yellow after 5 clicks
      //node.style.setProperty('background-color', 'yellow');
      node.setAttribute('disabled', 'disabled');
      node.setAttribute("src", "/icons/digglet-hole.png");
      console.log("Weblogger: Element " + node.id + " deleted? " + point_ids.splice(start, deleteCount))
      console.log(point_ids)
      selected_point_index = Math.floor(Math.random() * (point_ids.length));
      console.log("Weblogger: Selected position: " + selected_point_index)
      var element = document.getElementById(point_ids[selected_point_index]);
      element.setAttribute("src", "/icons/digglet-with-hole.png")
      element.removeAttribute("disabled")
      window.pointCalibrate++;
    }else if (window.calibrationPoints[id]<4){
        //Gradually increase the opacity of calibration points when click to give some indication to user.
        var opacity = 0.25*window.calibrationPoints[id]+0.25;
        node.style.setProperty('opacity', opacity);
    }

    //Show the middle calibration point after all other points have been clicked.
   /*  if (PointCalibrate == 8){
        document.getElementById('Pt5').style.removeProperty('display');
    } */

    if (window.pointCalibrate >= window.number_of_calibration_points){ // last point is calibrated
        // grab every element in Calibration class and hide them except the middle point.
        document.querySelectorAll('.Calibration').forEach((i) => {
          if(i.id != "PtPrecision"){
            i.style.setProperty('display', 'none');
          }
          else{
            i.style.setProperty('background-color', 'yellow');
            i.style.removeProperty('display');
          }
        });
        // clears the canvas
        var canvas = document.getElementById("plotting_canvas");
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        // Calculate the accuracy
        calcAccuracy();
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
window.addEventListener('load', docLoad);



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
  console.log("Weblogger: Running calibration.js from public folder")
  document.querySelectorAll('.Calibration').forEach((i) => {
    i.style.setProperty('display', 'none');
    i.setAttribute('disabled', 'disabled');
    i.style.setProperty('opacity', '1');
    //i.style.setProperty('background-color', 'red');
    /* if(i.id != "PtPrecision"){
      i.style.setProperty('opacity', '0.25');
      i.setAttribute('disabled', 'disabled');
    }
    else{
      i.style.setProperty('display', 'none');
    }
    //i.removeAttribute('disabled'); */
  });

  window.calibrationPoints = {};
  window.pointCalibrate = 0;
}

// sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
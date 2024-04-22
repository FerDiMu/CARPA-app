/*
 * Sets store_points to true, so all the occuring prediction
 * points are stored
 */
function store_points_variable(){
  console.log("WEBLOGGER: STARTED SSTORING POINTS")
  webgazer.params.storingPoints = true;
}

/*
 * Sets store_points to false, so prediction points aren't
 * stored any more
 */
function stop_storing_points_variable(){
  console.log("WEBLOGGER: STOPPED SSTORING POINTS")
  webgazer.params.storingPoints = false;
}

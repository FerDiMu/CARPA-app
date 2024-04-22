/*
 * Sets store_points to true, so all the occuring prediction
 * points are stored
 */
function store_points_variable(){
  const webgazer = require("./webgazer")
  webgazer.params.storingPoints = true;
}

/*
 * Sets store_points to false, so prediction points aren't
 * stored any more
 */
function stop_storing_points_variable(){
  const webgazer = require("./webgazer")
  webgazer.params.storingPoints = false;
}
module.exports = {store_points_variable, stop_storing_points_variable}

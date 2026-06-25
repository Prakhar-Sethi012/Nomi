/**
 * THE CRYSTAL BALL MATH ENGINE
 * Calculates attendance forecasts, safe bunks, and rescue missions.
 * * @param {number} attended - Number of classes attended
 * @param {number} conducted - Number of classes that have happened
 * @param {number} total - Total classes in the semester
 * @returns {Object} Forecast data (percentages, bunks, rescue classes)
 */
export const calculateForecast = (attended, conducted, total) => {
  const currentPct = conducted === 0 ? 0 : (attended / conducted) * 100;
  
  let safeBunks = 0;
  let rescueClasses = 0;
  let isImpossible = false;
  let remainingClasses = total - conducted;

  // Prevent negative remaining classes just in case conducted exceeds total
  if (remainingClasses < 0) remainingClasses = 0;

  if (currentPct >= 75) {
    // How many more classes can we miss before we hit exactly 75%?
    safeBunks = Math.floor(attended / 0.75) - conducted;
    if (safeBunks > remainingClasses) safeBunks = remainingClasses;
  } else {
    // How many consecutive classes must we attend to reach 75%?
    rescueClasses = Math.ceil((0.75 * conducted - attended) / 0.25);
    if (rescueClasses > remainingClasses) isImpossible = true;
  }

  return { 
    currentPct, 
    safeBunks, 
    rescueClasses, 
    isImpossible, 
    remainingClasses 
  };
};
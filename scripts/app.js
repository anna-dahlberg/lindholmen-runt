// Main application controller
import { initializeMap } from './map.js';
import { initializeWorkoutEventListeners, updateStartButtonState } from './workout.js';
import { initializeModalEventListeners } from './modals.js';

// Initialize the app when page loads
function initializeApp() {
  // Initialize map
  initializeMap();

  // Initialize all event listeners
  initializeWorkoutEventListeners();
  initializeModalEventListeners();

  // Initialize button state
  updateStartButtonState();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
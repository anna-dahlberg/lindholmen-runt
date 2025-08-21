import { route_1, route_2, route_3 } from './locations.js';
      
let selectedRoute = route_1; // Default to route 1
let selectedDifficulty = 'medium';
let currentWaypointIndex = 0;

// Timer variables
let startTime = null;
let timerInterval = null;
let isTimerRunning = false;

// Route selection based on time
function selectRoute(timeSelection) {
  switch(timeSelection) {
    case '10':
      return route_1; // 4 waypoints
    case '20':
      return route_2; // 9 waypoints  
    case '30':
      return route_3; // 13 waypoints
    default:
      return route_1;
  }
}

// Timer functions
function startTimer() {
  if (!isTimerRunning) {
    startTime = Date.now();
    isTimerRunning = true;
    timerInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay(); // Update immediately
  }
}

function stopTimer() {
  if (isTimerRunning) {
    isTimerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
}

function resetTimer() {
  stopTimer();
  startTime = null;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  // Update timer on map screen
  const timerElement = document.querySelector('.timer');
  if (timerElement) {
    const formattedTime = getFormattedTime();
    timerElement.textContent = formattedTime;
  }

  // Update timer on challenge screen
  const challengeTimerElement = document.querySelector('.challenge-timer');
  if (challengeTimerElement) {
    const formattedTime = getFormattedTime();
    challengeTimerElement.textContent = formattedTime;
  }
}

function getFormattedTime() {
  if (!startTime) {
    return '00:00';
  }

  const elapsed = isTimerRunning ? Date.now() - startTime : 0;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getElapsedTime() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

// Function to check if both selections are made and update button state
function updateStartButtonState() {
  const selectedTime = document.querySelector('input[name="time"]:checked');
  const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked');
  const startButton = document.getElementById("start-tracking");

  if (selectedTime && selectedDifficulty) {
    startButton.disabled = false;
    startButton.style.background = "var(--green)";
    startButton.style.cursor = "pointer";
  } else {
    startButton.disabled = true;
    startButton.style.background = "var(--grey)";
    startButton.style.cursor = "not-allowed";
  }
}

// Update map instruction text with current destination
function updateMapInstruction() {
  const instructionElement = document.querySelector('.map-instruction');
  if (!instructionElement) return;

  if (currentWaypointIndex < selectedRoute.length) {
    const currentWaypoint = selectedRoute[currentWaypointIndex];
    instructionElement.textContent = `Gå till ${currentWaypoint.name}`;
  } else {
    instructionElement.textContent = "Alla platser besökta!";
  }
}

// Update challenge screen with current waypoint data
function updateChallengeScreen(waypoint, difficulty) {
  document.getElementById('challenge-title').textContent = `${waypoint.name}`;
  
  let challengeText = '';
  switch(difficulty) {
    case 'easy':
      challengeText = waypoint.easy_challenge;
      break;
    case 'medium':
      challengeText = waypoint.medium_challenge;
      break;
    case 'hard':
      challengeText = waypoint.hard_challenge;
      break;
  }
  document.getElementById('challenge-text').textContent = challengeText;
  
  // Set the exercise image based on exercise_id
  const challengeImage = document.querySelector('.challenge-image');
    if (challengeImage && waypoint.exercise_id) {
      challengeImage.src = `assets/${waypoint.exercise_id}.png`;
      challengeImage.alt = `Exercise ${waypoint.exercise_id}`;
    }
}

// Screen navigation
function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
}

// Modal functions
function showCancelConfirmation() {
  const modal = document.getElementById('cancelModal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }
}

function hideCancelConfirmation() {
  const modal = document.getElementById('cancelModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

function confirmCancel() {
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
  
  hideCancelConfirmation();
  
  // Your existing cancel logic
  setTimeout(() => {
    resetTimer();
    
    // Reset selections
    document.querySelectorAll('input[name="time"]').forEach((radio) => (radio.checked = false));
    document.querySelectorAll('input[name="difficulty"]').forEach((radio) => (radio.checked = false));
    
    currentWaypointIndex = 0;
    showScreen("start-screen");
    updateStartButtonState();
  }, 300);
}

// Make functions available globally for HTML onclick handlers
window.showCancelConfirmation = showCancelConfirmation;
window.hideCancelConfirmation = hideCancelConfirmation;
window.confirmCancel = confirmCancel;

// Start tracking button
document.getElementById("start-tracking").addEventListener("click", function () {
  const selectedTime = document.querySelector('input[name="time"]:checked');
  const selectedDifficultyRadio = document.querySelector('input[name="difficulty"]:checked');

  if (!selectedTime || !selectedDifficultyRadio) {
    alert("Vänligen välj både tid och svårighetsgrad!");
    return;
  }

  // Set global variables
  selectedRoute = selectRoute(selectedTime.value);
  selectedDifficulty = selectedDifficultyRadio.value;
  currentWaypointIndex = 0;

  // Update waypoints for the map
  window.currentWaypoints = selectedRoute;
  
  // Start the timer when creating route
  startTimer();
  
  showScreen("map-screen");
  
  // Update instruction text for the first waypoint
  updateMapInstruction();
  
  // Initialize map with selected route
  if (window.initializeMapWithRoute) {
    window.initializeMapWithRoute(selectedRoute);
  }
});

// Arrived button
document.getElementById("arrived-btn").addEventListener("click", function () {
  if (currentWaypointIndex < selectedRoute.length) {
    const currentWaypoint = selectedRoute[currentWaypointIndex];
    updateChallengeScreen(currentWaypoint, selectedDifficulty);
    showScreen("challenge-screen");
  }
});

// Done button - now marks waypoint as visited
document.getElementById("done-btn").addEventListener("click", function () {
  // Mark current waypoint as visited before moving to next
  if (window.markWaypointAsVisited && currentWaypointIndex < selectedRoute.length) {
    window.markWaypointAsVisited(currentWaypointIndex);
  }
  
  currentWaypointIndex++;
  
  if (currentWaypointIndex >= selectedRoute.length) {
    // All waypoints completed - stop the timer
    stopTimer();
    
    // Show completion time on final screen
    const finalTime = getElapsedTime();
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update final screen with completion time
    setTimeout(() => {
      const finalScreen = document.getElementById('final-screen');
      if (finalScreen) {
        const container = finalScreen.querySelector('.final-time-container');
        if (container) {
          let timeDisplay = container.querySelector('.completion-time');

          if (!timeDisplay) {
            timeDisplay = document.createElement('p');
            timeDisplay.className = 'completion-time';
            timeDisplay.style.fontSize = '1.5rem';
            timeDisplay.style.fontWeight = '500';
            timeDisplay.style.marginBottom = '40px';
            
            container.appendChild(timeDisplay);
          }
          timeDisplay.textContent = `Total tid: ${timeString}`;
        }
      }
    }, 100);
    
    showScreen("final-screen");
  } else {
    // Go back to map for next waypoint
    showScreen("map-screen");
    // Update instruction text for the next waypoint
    updateMapInstruction();
  }
});

// Home button
document.getElementById("home-btn").addEventListener("click", function () {
  // Reset timer when going home
  resetTimer();
  
  // Reset selections
  document.querySelectorAll('input[name="time"]').forEach((radio) => (radio.checked = false));
  document.querySelectorAll('input[name="difficulty"]').forEach((radio) => (radio.checked = false));
  
  currentWaypointIndex = 0;
  showScreen("start-screen");
});

// Cancel links - handle both map and challenge screen cancel buttons
document.querySelectorAll(".cancel-link").forEach(function(cancelLink) {
  cancelLink.addEventListener("click", function(e) {
    e.preventDefault();
    showCancelConfirmation(); // Show modal instead of direct cancel
  });
});

// Modal event listeners - THESE NEED TO BE OUTSIDE AND RUN ON PAGE LOAD
document.addEventListener('DOMContentLoaded', function() {
  // Close modal when clicking outside
  const cancelModal = document.getElementById('cancelModal');
  if (cancelModal) {
    cancelModal.addEventListener('click', function(e) {
      if (e.target === this) {
        hideCancelConfirmation();
      }
    });
  }

  // Prevent modal from closing when clicking inside
  const modal = document.querySelector('.modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('cancelModal');
    if (modal && modal.classList.contains('show')) {
      hideCancelConfirmation();
    }
  }
});

// Make route data available globally for script.js
window.currentWaypoints = selectedRoute;
window.selectedDifficulty = selectedDifficulty;
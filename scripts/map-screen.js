import { route_1, route_2, route_3 } from './locations.js';
      
let selectedRoute = route_1; 
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
      return route_3; // 11 waypoints
    default:
      return route_1;
  }
}

// Reset current waypoint index (called from script.js)
function resetCurrentWaypointIndex() {
  currentWaypointIndex = 0;
}

// Get current waypoint index based on visited status
function getCurrentWaypointIndex() {
  // Find the first unvisited waypoint
  const nextIndex = selectedRoute.findIndex(wp => !wp.visited);
  return nextIndex === -1 ? selectedRoute.length : nextIndex;
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
  const timerElement = document.querySelector('.timer');
  if (timerElement) {
    const formattedTime = getFormattedTime();
    timerElement.textContent = formattedTime;
  }

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

  currentWaypointIndex = getCurrentWaypointIndex();

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

    const exerciseAltText = {
    1: "Person som gör dips med hjälp av en bänk",
    2: "Person som gör armhävningar på marken", 
    3: "Person som springer mellan två punkter",
    4: "Person som gör utfallssteg",
    6: "Person som gör situps",
    7: "Person som springer uppför en trappa",
    8: "Person som joggar/springer uppför en backe",
    9: "Person som gör tåhävningar på en trottoarkant",
    10: "Person gör plankan i gräset"
  };
  
  // Set the exercise image based on exercise_id
  const challengeImage = document.querySelector('.challenge-image');
  if (challengeImage && waypoint.exercise_id) {
    challengeImage.src = `assets/${waypoint.exercise_id}.png`;
    challengeImage.alt = exerciseAltText[waypoint.exercise_id] || `Övningsdemonstration ${waypoint.exercise_id}`;
  }
}

// Screen navigation
function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  document.getElementById(screenId).classList.add("active");
        
  if (screenId === "map-screen") {
    setTimeout(() => {
      updateMapInstruction();
      if (window.map) {
        window.map.invalidateSize();
      }
    }, 100);
  }
}

// Modal functions
function showCancelConfirmation() {
  const modal = document.getElementById('cancelModal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
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
  
  hideCancelConfirmation();
  
  setTimeout(() => {
    resetTimer();
    
    if (window.resetWaypoints) {
      window.resetWaypoints();
    }
    
    currentWaypointIndex = 0;
    
    document.querySelectorAll('input[name="time"]').forEach((radio) => (radio.checked = false));
    document.querySelectorAll('input[name="difficulty"]').forEach((radio) => (radio.checked = false));
    
    showScreen("start-screen");
    updateStartButtonState();
  }, 300);
}

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

  selectedRoute = selectRoute(selectedTime.value);
  selectedDifficulty = selectedDifficultyRadio.value;
  currentWaypointIndex = 0;

  selectedRoute.forEach(waypoint => {
      waypoint.visited = false;
    });

  window.currentWaypoints = selectedRoute;
  
  startTimer();
  showScreen("map-screen");
  updateMapInstruction();
  
  if (window.initializeMapWithRoute) {
    window.initializeMapWithRoute(selectedRoute);
  }
});

// Arrived button
document.getElementById("arrived-btn").addEventListener("click", function () {
  currentWaypointIndex = getCurrentWaypointIndex();
  
  if (currentWaypointIndex < selectedRoute.length) {
    const currentWaypoint = selectedRoute[currentWaypointIndex];
    updateChallengeScreen(currentWaypoint, selectedDifficulty);
    showScreen("challenge-screen");
  }
});

// Done button 
document.getElementById("done-btn").addEventListener("click", function () {
  // Sync with actual waypoint state
  currentWaypointIndex = getCurrentWaypointIndex();
  
  if (window.markWaypointAsVisited && currentWaypointIndex < selectedRoute.length) {
    window.markWaypointAsVisited(currentWaypointIndex);
  }
  
  currentWaypointIndex = getCurrentWaypointIndex();
  
  if (currentWaypointIndex >= selectedRoute.length) {
    stopTimer();
    
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
    showScreen("map-screen");

    updateMapInstruction();
  }
});

// Home button
document.getElementById("home-btn").addEventListener("click", function () {
  resetTimer();
  
  if (window.resetWaypoints) {
    window.resetWaypoints();
  }
  
  document.querySelectorAll('input[name="time"]').forEach((radio) => (radio.checked = false));
  document.querySelectorAll('input[name="difficulty"]').forEach((radio) => (radio.checked = false));
  
  currentWaypointIndex = 0;
  
  updateStartButtonState();
  
  showScreen("start-screen");
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

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll(".cancel-link").forEach(function(cancelLink) {
    cancelLink.addEventListener("click", function(e) {
      e.preventDefault();
      showCancelConfirmation();
    });
  });

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

function goBackToMap() {
    showScreen("map-screen");
    updateMapInstruction(); 
}



// Make functions available globally 
window.goBackToMap = goBackToMap;
window.currentWaypoints = selectedRoute;
window.selectedDifficulty = selectedDifficulty;
window.resetCurrentWaypointIndex = resetCurrentWaypointIndex;
window.getCurrentWaypointIndex = getCurrentWaypointIndex;
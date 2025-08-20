 import { waypoints, route_2, route_3 } from './locations.js';
      
      let selectedRoute = waypoints; // Default to route 1
      let selectedDifficulty = 'medium';
      let currentWaypointIndex = 0;

      // Route selection based on time
      function selectRoute(timeSelection) {
        switch(timeSelection) {
          case '10':
            return waypoints; // 4 waypoints
          case '20':
            return route_2; // 9 waypoints  
          case '30':
            return route_3; // 13 waypoints
          default:
            return waypoints;
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
      }

      // Screen navigation
      function showScreen(screenId) {
        const screens = document.querySelectorAll(".screen");
        screens.forEach((screen) => {
          screen.classList.remove("active");
        });
        document.getElementById(screenId).classList.add("active");
      }

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
        
        showScreen("map-screen");
        
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

      // Done button
      document.getElementById("done-btn").addEventListener("click", function () {
        currentWaypointIndex++;
        
        if (currentWaypointIndex >= selectedRoute.length) {
          // All waypoints completed
          showScreen("final-screen");
        } else {
          // Go back to map for next waypoint
          showScreen("map-screen");
        }
      });

      // Home button
      document.getElementById("home-btn").addEventListener("click", function () {
        // Reset selections
        document.querySelectorAll('input[name="time"]').forEach((radio) => (radio.checked = false));
        document.querySelectorAll('input[name="difficulty"]').forEach((radio) => (radio.checked = false));
        
        currentWaypointIndex = 0;
        showScreen("start-screen");
      });

      // Cancel link
      document.getElementById("cancel-link").addEventListener("click", function(e) {
        e.preventDefault();
        showScreen("start-screen");
      });

      // Make route data available globally for script.js
      window.currentWaypoints = selectedRoute;
      window.selectedDifficulty = selectedDifficulty;
import { route_1 } from "./locations.js";

let map;
let userLocationMarker;
let userLocation = null;
let waypointMarkers = [];
let routePolyline; // New: Line connecting waypoints
let trailCoordinates = [];
let trailPolyline;
let isTracking = false;
let userHeading = null;
let compassGranted = false;
let currentWaypoints = route_1; // Default waypoints

// Mobile-specific utilities
function vibrate(pattern = [100]) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

// Initialize map with dynamic waypoints
function initMap() {
  // Create map centered on first waypoint of current route
  map = L.map("map", {
    zoomControl: true,
    attributionControl: false,
  }).setView(currentWaypoints[0].coordinates, 16);

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  addWaypoints();

  // Initialize trail polyline (user's actual path)
  trailPolyline = L.polyline([], {
    color: "#ff3366",
    weight: 4,
    opacity: 0.8,
  }).addTo(map);

  // Add mobile-specific map interactions
  map.on("dragstart", () => {
    // Prevent scrolling while dragging map
    document.body.style.overflow = "hidden";
  });

  map.on("dragend", () => {
    document.body.style.overflow = "";
  });

  // Set up Leaflet location event handlers
  map.on("locationfound", onLocationFound);
}

// Function to initialize map with a specific route
function initializeMapWithRoute(newWaypoints) {
  currentWaypoints = newWaypoints;

  if (map) {
    // Clear existing waypoint markers
    waypointMarkers.forEach((marker) => {
      map.removeLayer(marker);
    });
    waypointMarkers = [];

    // Clear existing route line
    if (routePolyline) {
      map.removeLayer(routePolyline);
    }

    // Add new waypoints and route line
    addWaypoints();

  
  } else {
    // Initialize map if it doesn't exist yet
    initMap();
  }
}

// Make these functions available globally
window.initializeMapWithRoute = initializeMapWithRoute;
window.markWaypointAsVisited = markWaypointAsVisited;

// Handle successful location detection
function onLocationFound(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  const accuracy = e.accuracy;

  userLocation = [lat, lng];

  console.log(
    `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}, Accuracy: ${accuracy}m`
  );

  // Add to trail
  trailCoordinates.push(userLocation);

  // Update or create user location marker with directional indicator
  if (userLocationMarker) {
    userLocationMarker.setLatLng(userLocation);
  } else {
    // Create marker with directional indicator
    const userIcon = L.divIcon({
      className: "",
      html: '<div class="user-marker"></div>', // Using the enhanced CSS class
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    userLocationMarker = L.marker(userLocation, { icon: userIcon }).addTo(map);

    // Center map on user location initially with higher zoom
    map.setView(userLocation, 18);

  }

}



// Add waypoints to map (now includes route line)
function addWaypoints() {
  // Create route line connecting all waypoints
  const routeCoordinates = currentWaypoints.map(waypoint => waypoint.coordinates);
  
  routePolyline = L.polyline(routeCoordinates, {
    color: "#417b5a", // Using your app's green color
    weight: 3,
    opacity: 0.7,
    dashArray: "5, 10" // Dashed line to distinguish from user trail
  }).addTo(map);

  // Add waypoint markers
  currentWaypoints.forEach((waypoint, index) => {
    const markerClass = waypoint.visited
      ? "waypoint-visited"
      : index === 0
      ? "waypoint-start"
      : "waypoint-pending";

    // Use checkmark for visited waypoints, number for others
    const markerContent = waypoint.visited ? "✓" : index + 1;

    const icon = L.divIcon({
      className: "",
      html: `<div class="waypoint-marker ${markerClass}">${markerContent}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker(waypoint.coordinates, { icon: icon }).addTo(map);

    waypointMarkers.push(marker);
    waypoint.marker = marker;
  });
}

// Start location tracking using Leaflet's locate method
function startTracking() {
  if (!navigator.geolocation) {
    showMobileNotification("GPS not available on this device", "error");
    return;
  }

  isTracking = true;
  vibrate([100, 50, 100]);

  // Use Leaflet's locate method
  map.locate({
    watch: true, // Continuously watch for location changes
    enableHighAccuracy: true, // Use GPS for better accuracy
    timeout: 15000, // Timeout after 15 seconds
    maximumAge: 0, // Always get fresh location
    setView: false, // Don't set view automatically
  });

  const startBtn = document.getElementById("start-tracking");
  if (startBtn) startBtn.disabled = true;
}



// Manual waypoint completion function
function markWaypointAsVisited(waypointIndex) {
  if (waypointIndex >= 0 && waypointIndex < currentWaypoints.length) {
    const waypoint = currentWaypoints[waypointIndex];

    if (!waypoint.visited) {
      waypoint.visited = true;

      // Mobile haptic feedback
      vibrate([200, 100, 200, 100, 200]);

      // Update marker appearance with checkmark
      const newIcon = L.divIcon({
        className: "",
        html: `<div class="waypoint-marker waypoint-visited">✓</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      waypoint.marker.setIcon(newIcon);

      

      // Show mobile-friendly completion message
      setTimeout(() => {
        // Check if all waypoints completed
        if (currentWaypoints.every((wp) => wp.visited)) {
          setTimeout(() => {
            vibrate([300, 100, 300, 100, 300, 100, 300]);
          }, 1500);
        }
      }, 500);
    }
  }
}


// Get next unvisited waypoint index (now uses currentWaypoints)
function getNextWaypointIndex() {
  return currentWaypoints.findIndex((wp) => !wp.visited);
}







// Initialize the app when page loads
function initializeApp() {
  initMap();

  // Add event listeners after map is initialized
  const startBtn = document.getElementById("start-tracking");
  const stopBtn = document.getElementById("stop-tracking");
  const resetBtn = document.getElementById("reset-waypoints");
  const centerBtn = document.getElementById("center-user");
  const setWaypointsBtn = document.getElementById("set-waypoints");
  const trailToggle = document.getElementById("show-trail");

  if (startBtn) startBtn.addEventListener("click", startTracking);
  if (stopBtn) stopBtn.addEventListener("click", stopTracking);
  if (resetBtn) resetBtn.addEventListener("click", resetWaypoints);
  if (centerBtn) centerBtn.addEventListener("click", centerOnUser);
  if (trailToggle) trailToggle.addEventListener("change", toggleTrail);
}

function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });
  const activeScreen = document.getElementById(screenId);
  activeScreen.classList.add("active");


  if (screenId === "map-screen" && map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 100); // Timeout säkerställer att div:en är synlig
  }
}

// Function to check if both selections are made and update button state
function updateStartButtonState() {
  const selectedTime = document.querySelector('input[name="time"]:checked');
  const selectedDifficulty = document.querySelector(
    'input[name="difficulty"]:checked'
  );
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

// Initialize button state and add listeners when DOM loads
document.addEventListener("DOMContentLoaded", function () {
  // Initially disable the button
  updateStartButtonState();

  // Add listeners to time and difficulty selections
  document
    .querySelectorAll('input[name="time"], input[name="difficulty"]')
    .forEach((radio) => {
      radio.addEventListener("change", updateStartButtonState);
    });
});

document
  .getElementById("start-tracking")
  .addEventListener("click", function () {
    const selectedTime = document.querySelector('input[name="time"]:checked');
    const selectedDifficulty = document.querySelector(
      'input[name="difficulty"]:checked'
    );

    if (!selectedTime || !selectedDifficulty) {
      alert("Vänligen välj både tid och svårighetsgrad!");
      return;
    }

    showScreen("map-screen");
  });

document.getElementById("arrived-btn").addEventListener("click", function () {
  showScreen("challenge-screen");
});

document.getElementById("done-btn").addEventListener("click", function () {
  showScreen("final-screen");
});

document.getElementById("home-btn").addEventListener("click", function () {
  document
    .querySelectorAll('input[name="time"]')
    .forEach((radio) => (radio.checked = false));
  document
    .querySelectorAll('input[name="difficulty"]')
    .forEach((radio) => (radio.checked = false));

  // Update button state after clearing selections
  updateStartButtonState();

  showScreen("start-screen");
});

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
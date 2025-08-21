import { route_1 } from "./locations.js";

let map;
let userLocationMarker;
let userLocation = null;
let waypointMarkers = [];
let trailCoordinates = [];
let trailPolyline;
let isTracking = false;
let userHeading = null;
let compassGranted = false;
let currentWaypoints = route_1; 

// Initialize map with dynamic waypoints
function initMap() {
  map = L.map("map", {
    zoomControl: true,
    attributionControl: false,
  }).setView(currentWaypoints[0].coordinates, 16);

  window.map = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  addWaypoints();
  
  // Add mobile-specific map interactions
  map.on("dragstart", () => {
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
    waypointMarkers.forEach((marker) => {
      map.removeLayer(marker);
    });
    waypointMarkers = [];

    addWaypoints();

  } else {
    initMap();
  }
}

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

  trailCoordinates.push(userLocation);

  // Update or create user location marker with directional indicator
  if (userLocationMarker) {
    userLocationMarker.setLatLng(userLocation);
  } else {
    const userIcon = L.divIcon({
      className: "",
      html: '<div class="user-marker"></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    userLocationMarker = L.marker(userLocation, { icon: userIcon }).addTo(map);

    map.setView(userLocation, 18);
  }
}

// Get current waypoint index (first unvisited waypoint)
function getCurrentWaypointIndex() {
  return currentWaypoints.findIndex(wp => !wp.visited);
}

// Update waypoint marker appearance based on its state
function updateWaypointMarker(waypoint, index) {
  if (!waypoint.marker) return;
  
  const currentIndex = getCurrentWaypointIndex();
  let markerClass, markerContent;
  
  if (waypoint.visited) {
    markerClass = "waypoint-visited";
    markerContent = "✓";
  } else if (index === currentIndex) {
    markerClass = "waypoint-pending current-target";
    markerContent = index + 1;
  } else if (index === 0 && currentIndex === 0) {
    markerClass = "waypoint-start current-target";
    markerContent = index + 1;
  } else if (index === 0) {
    markerClass = "waypoint-start";
    markerContent = index + 1;
  } else {
    markerClass = "waypoint-pending";
    markerContent = index + 1;
  }

  const newIcon = L.divIcon({
    className: "",
    html: `<div class="waypoint-marker ${markerClass}">${markerContent}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  waypoint.marker.setIcon(newIcon);
}

// Update all waypoint markers to reflect current state
function updateAllWaypointMarkers() {
  currentWaypoints.forEach((waypoint, index) => {
    updateWaypointMarker(waypoint, index);
  });
}

// Add waypoints to map (now includes route line and current target highlighting)
function addWaypoints() {
  currentWaypoints.forEach((waypoint, index) => {
    const marker = L.marker(waypoint.coordinates, { 
      icon: L.divIcon({
        className: "",
        html: `<div class="waypoint-marker"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
    }).addTo(map);

    waypointMarkers.push(marker);
    waypoint.marker = marker;
  });

  updateAllWaypointMarkers();
}

// Start location tracking using Leaflet's locate method
function startTracking() {
  if (!navigator.geolocation) {
    showMobileNotification("GPS not available on this device", "error");
    return;
  }
  isTracking = true;

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

      updateAllWaypointMarkers();

      setTimeout(() => {
        if (currentWaypoints.every((wp) => wp.visited)) {
          setTimeout(() => {
            
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

// Reset all waypoints in current route to unvisited
function resetWaypoints() {
  currentWaypoints.forEach((waypoint) => {
    waypoint.visited = false;
  });
  
  updateAllWaypointMarkers();
  
  trailCoordinates = [];
  if (trailPolyline) {
    trailPolyline.setLatLngs([]);
  }
  
  if (window.resetCurrentWaypointIndex) {
    window.resetCurrentWaypointIndex();
  }
  
  console.log("All waypoints reset to unvisited state");
}

// Stop location tracking
function stopTracking() {
  if (isTracking) {
    isTracking = false;
    map.stopLocate(); 
    
    const startBtn = document.getElementById("start-tracking");
    if (startBtn) startBtn.disabled = false;
    
    console.log("Tracking stopped");
  }
}

// Center map on user location
function centerOnUser() {
  if (userLocation && map) {
    map.setView(userLocation, 18);
  } else {
    showMobileNotification("Location not available", "error");
  }
}

window.resetWaypoints = resetWaypoints;
window.centerOnUser = centerOnUser;

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
    }, 100); 
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
  updateStartButtonState();

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

  updateStartButtonState();

  showScreen("start-screen");
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
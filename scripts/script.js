import { waypoints } from "./locations.js";

let map;
let userLocationMarker;
let userLocation = null;
let waypointMarkers = [];
let trailCoordinates = [];
let trailPolyline;
const visitRadius = 10; // meters
let isTracking = false;
let userHeading = null;
let compassGranted = false;
let currentWaypoints = waypoints; // Default waypoints

// Mobile-specific utilities
function vibrate(pattern = [100]) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function initCompass() {
  // Check if device supports device orientation
  if (!window.DeviceOrientationEvent) {
    console.log("Device orientation not supported");
    showMobileNotification("📱 Compass not available on this device", "info");
    return;
  }

  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    // iOS 13+ requires permission
    DeviceOrientationEvent.requestPermission()
      .then((permissionState) => {
        if (permissionState === "granted") {
          compassGranted = true;
          // Try absolute orientation first, fall back to regular orientation
          window.addEventListener("deviceorientationabsolute", handleOrientation, true);
          window.addEventListener("deviceorientation", handleOrientation, true);
        } else {
          showMobileNotification("⚠️ Compass permission denied", "error");
        }
      })
      .catch((error) => {
        console.error("Compass permission error:", error);
        showMobileNotification("⚠️ Compass permission error", "error");
      });
  } else {
    // Non iOS or older devices - try both event types
    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);
    compassGranted = true;
  }
}

function handleOrientation(event) {
  // Get the device heading (alpha is the compass direction)
  let heading = null;

  if (event.webkitCompassHeading !== undefined) {
    // iOS devices - webkitCompassHeading gives true north
    heading = event.webkitCompassHeading;
  } else if (event.absolute === true && event.alpha !== null) {
    // Android devices with absolute orientation
    heading = 360 - event.alpha;
  } else if (event.alpha !== null) {
    // Fallback for devices without absolute orientation
    heading = 360 - event.alpha;
  }

  if (heading !== null && !isNaN(heading)) {
    // Normalize heading to 0-360 range
    heading = ((heading % 360) + 360) % 360;
    
    userHeading = heading;
    updateUserMarker();
    
    // Optional: Update a compass display in the UI
    updateCompassDisplay(heading);
  }
}

function updateUserMarker() {
  if (!userLocationMarker || userHeading === null) return;

  const markerElement = userLocationMarker.getElement();
  if (markerElement) {
    const arrow = markerElement.querySelector(".user-marker");
    if (arrow) {
      // Apply rotation to show direction
      arrow.style.transform = `rotate(${userHeading}deg)`;
      
      // Optional: Add smooth transition for compass updates
      arrow.style.transition = "transform 0.3s ease-out";
    }
  }
}

function showMobileNotification(message, type = "success") {
  // Create custom mobile-friendly notification
  const notification = document.createElement("div");
  let bgColor;
  switch (type) {
    case "success":
      bgColor = "linear-gradient(135deg, #11998e, #38ef7d)";
      break;
    case "error":
      bgColor = "linear-gradient(135deg, #fc466b, #3f5efb)";
      break;
    case "info":
      bgColor = "linear-gradient(135deg, #667eea, #764ba2)";
      break;
    default:
      bgColor = "linear-gradient(135deg, #11998e, #38ef7d)";
  }

  notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${bgColor};
        color: white;
        padding: 20px 30px;
        border-radius: 16px;
        font-size: 18px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        text-align: center;
        max-width: 80vw;
    `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Animate in
  notification.style.opacity = "0";
  notification.style.transform = "translate(-50%, -50%) scale(0.8)";
  setTimeout(() => {
    notification.style.transition = "all 0.3s ease";
    notification.style.opacity = "1";
    notification.style.transform = "translate(-50%, -50%) scale(1)";
  }, 10);

  // Remove after delay
  const duration = type === "info" ? 2000 : 3000;
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translate(-50%, -50%) scale(0.8)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);

  return notification;
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
  updateWaypointList();

  // Initialize trail polyline
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
  map.on("locationerror", onLocationError);
}

// Function to initialize map with a specific route
function initializeMapWithRoute(newWaypoints) {
  currentWaypoints = newWaypoints;
  
  if (map) {
    // Clear existing waypoint markers
    waypointMarkers.forEach(marker => {
      map.removeLayer(marker);
    });
    waypointMarkers = [];
    
    // Add new waypoints
    addWaypoints();
    updateWaypointList();
    
    // Center map on first waypoint of new route
    if (newWaypoints.length > 0) {
      map.setView(newWaypoints[0].coordinates, 16);
    }
  } else {
    // Initialize map if it doesn't exist yet
    initMap();
  }
}

// Make this function available globally
window.initializeMapWithRoute = initializeMapWithRoute;

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
    // Update popup with current coordinates
    userLocationMarker.setPopupContent(`
            <h4>📍 Your Location</h4>
            <p>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(
      6
    )}<br>Accuracy: ${Math.round(accuracy)}m</p>
        `);
  } else {
    // Create marker with directional indicator
    const userIcon = L.divIcon({
      className: "",
      html: '<div class="user-marker"></div>', // Using the enhanced CSS class
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    userLocationMarker = L.marker(userLocation, { icon: userIcon }).addTo(map)
      .bindPopup(`
                <h4>📍 Your Location</h4>
                <p>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(
      6
    )}<br>Accuracy: ${Math.round(accuracy)}m</p>
            `);

    // Center map on user location initially with higher zoom
    map.setView(userLocation, 18);

    // Initialize compass for direction
    initCompass();
  }

  checkWaypoints();
  updateDistanceInfo();
}

// Handle location detection errors
function onLocationError(e) {
  let message = "";
  switch (e.code) {
    case 1: // PERMISSION_DENIED
      message = "📍 Please allow GPS access in your browser settings";
      break;
    case 2: // POSITION_UNAVAILABLE
      message = "📡 GPS signal unavailable. Try moving to an open area";
      break;
    case 3: // TIMEOUT
      message = "⏱️ GPS timeout. Check your connection and try again";
      break;
    default:
      message = "❌ GPS error occurred. Please try again";
      break;
  }
  console.error("Location error:", e);
  vibrate([300, 100, 300]);
  showMobileNotification(message, "error");

  // Reset tracking state on error
  stopTracking();
}

// Add waypoints to map (now uses currentWaypoints instead of hardcoded waypoints)
function addWaypoints() {
  currentWaypoints.forEach((waypoint, index) => {
    const markerClass = waypoint.visited
      ? "waypoint-visited"
      : index === 0
      ? "waypoint-start"
      : "waypoint-pending";

    const icon = L.divIcon({
      className: "",
      html: `<div class="waypoint-marker ${markerClass}">${index + 1}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker(waypoint.coordinates, { icon: icon }).addTo(map)
      .bindPopup(`
                <h4>${waypoint.name}</h4>
                <p>${waypoint.description || ''}</p>
                <small>Status: ${
                  waypoint.visited
                    ? '<strong style="color: green;">Visited ✓</strong>'
                    : "Pending"
                }</small>
            `);

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
    setView: false, // Don't automatically set view (we'll handle it)
  });

  const startBtn = document.getElementById("start-tracking");
  if (startBtn) startBtn.disabled = true;
}

// Stop location tracking
function stopTracking() {
  isTracking = false;
  vibrate([200]);

  // Stop Leaflet's location watching
  map.stopLocate();

  const startBtn = document.getElementById("start-tracking");
  const stopBtn = document.getElementById("stop-tracking");
  const centerBtn = document.getElementById("center-user");
  
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  if (centerBtn) centerBtn.disabled = true;

  showMobileNotification("ℹ️ GPS tracking stopped");
}

// Check if user has reached any waypoints (now uses currentWaypoints)
function checkWaypoints() {
  if (!userLocation) return;

  currentWaypoints.forEach((waypoint, index) => {
    if (!waypoint.visited) {
      const distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        waypoint.coordinates[0],
        waypoint.coordinates[1]
      );

      if (distance <= visitRadius) {
        waypoint.visited = true;

        // Mobile haptic feedback
        vibrate([200, 100, 200, 100, 200]);

        // Update marker appearance
        const newIcon = L.divIcon({
          className: "",
          html: `<div class="waypoint-marker waypoint-visited">${
            index + 1
          }</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        waypoint.marker.setIcon(newIcon);
        waypoint.marker.setPopupContent(`
                    <h4>${waypoint.name} ✓</h4>
                    <p>${waypoint.description || ''}</p>
                    <small>Status: <strong style="color: green;">Visited!</strong></small>
                `);

        updateWaypointList();

        // Show mobile-friendly completion message
        setTimeout(() => {
          showMobileNotification(`🎯 ${waypoint.name} reached!`);

          // Check if all waypoints completed
          if (currentWaypoints.every((wp) => wp.visited)) {
            setTimeout(() => {
              vibrate([300, 100, 300, 100, 300, 100, 300]);
              showMobileNotification("🎉 All waypoints completed! Amazing!");
            }, 1500);
          }
        }, 500);
      }
    }
  });
}

// Calculate distance between two points in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Update waypoint list display (now uses currentWaypoints)
function updateWaypointList() {
  const progressText = document.getElementById("progress-text");
  const progressDots = document.getElementById("progress-dots");

  // Check if elements exist (they might not during initialization)
  if (!progressText || !progressDots) {
    return;
  }

  const visitedCount = currentWaypoints.filter((wp) => wp.visited).length;
  progressText.textContent = `Progress: ${visitedCount}/${currentWaypoints.length}`;

  while (progressDots.firstChild) {
    progressDots.removeChild(progressDots.firstChild);
  }
  currentWaypoints.forEach((waypoint, index) => {
    const dot = document.createElement("div");
    dot.className = "progress-dot";

    if (waypoint.visited) {
      dot.classList.add("visited");
    } else if (index === getNextWaypointIndex()) {
      dot.classList.add("current");
    }

    progressDots.appendChild(dot);
  });
}

// Get next unvisited waypoint index (now uses currentWaypoints)
function getNextWaypointIndex() {
  return currentWaypoints.findIndex((wp) => !wp.visited);
}

// Update distance information (now uses currentWaypoints)
function updateDistanceInfo() {
  const distanceElement = document.getElementById("distance-info");

  // Check if element exists
  if (!distanceElement) {
    return;
  }

  if (!userLocation) {
    while (distanceElement.firstChild) {
      distanceElement.removeChild(distanceElement.firstChild);
    }
    const strong = document.createElement("strong");
    strong.textContent = "Distance to next: --";
    distanceElement.appendChild(strong);
    return;
  }

  const nextIndex = getNextWaypointIndex();
  if (nextIndex === -1) {
    while (distanceElement.firstChild) {
      distanceElement.removeChild(distanceElement.firstChild);
    }
    const strong = document.createElement("strong");
    strong.textContent = "🎉 All waypoints completed!";
    distanceElement.appendChild(strong);
    return;
  }

  const nextWaypoint = currentWaypoints[nextIndex];
  const distance = calculateDistance(
    userLocation[0],
    userLocation[1],
    nextWaypoint.coordinates[0],
    nextWaypoint.coordinates[1]
  );

  while (distanceElement.firstChild) {
    distanceElement.removeChild(distanceElement.firstChild);
  }
  const strong = document.createElement("strong");
  strong.textContent = `Next: ${nextWaypoint.name}`;
  distanceElement.appendChild(strong);
  distanceElement.appendChild(document.createElement("br"));
  const distanceText = document.createTextNode(
    `Distance: ${Math.round(distance)}m`
  );
  distanceElement.appendChild(distanceText);
}

// Reset waypoints and trail (now uses currentWaypoints)
function resetWaypoints() {
  vibrate([100, 50, 100]);

  currentWaypoints.forEach((waypoint, index) => {
    waypoint.visited = false;

    const markerClass = index === 0 ? "waypoint-start" : "waypoint-pending";
    const newIcon = L.divIcon({
      className: "",
      html: `<div class="waypoint-marker ${markerClass}">${index + 1}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    waypoint.marker.setIcon(newIcon);
    waypoint.marker.setPopupContent(`
            <h4>${waypoint.name}</h4>
            <p>${waypoint.description || ''}</p>
            <small>Status: Pending</small>
        `);
  });

  // Clear trail
  trailCoordinates = [];
  trailPolyline.setLatLngs([]);

  updateWaypointList();
  updateDistanceInfo();

  showMobileNotification("🔄 Reset complete!");
}

// Center map on user location
function centerOnUser() {
  if (userLocation) {
    map.setView(userLocation, 17);
    vibrate([50]);
    showMobileNotification("📍 Centered on your location");
  }
}

// Toggle trail visibility
function toggleTrail() {
  // Check if trailPolyline is initialized
  if (!trailPolyline) {
    return;
  }

  const showTrail = document.getElementById("show-trail");
  if (showTrail && showTrail.checked) {
    trailPolyline.setLatLngs(trailCoordinates);
  } else {
    trailPolyline.setLatLngs([]);
  }
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
  document.getElementById(screenId).classList.add("active");
}

//Screen selection logic

// Function to check if both selections are made and update button state
function updateStartButtonState() {
  const selectedTime = document.querySelector('input[name="time"]:checked');
  const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked');
  const startButton = document.getElementById('start-tracking');
  
  if (selectedTime && selectedDifficulty) {
    startButton.disabled = false;
    startButton.style.background = 'var(--green)';
    startButton.style.cursor = 'pointer';
  } else {
    startButton.disabled = true;
    startButton.style.background = 'var(--grey)';
    startButton.style.cursor = 'not-allowed';
  }
}

// Initialize button state and add listeners when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  // Initially disable the button
  updateStartButtonState();
  
  // Add listeners to time and difficulty selections
  document.querySelectorAll('input[name="time"], input[name="difficulty"]').forEach(radio => {
    radio.addEventListener('change', updateStartButtonState);
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
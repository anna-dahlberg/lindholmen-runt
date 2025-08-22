// Map and location functionality module
import { route_1 } from "./locations.js";
import { showLocationErrorModal, hideLocationErrorModal } from './modals.js';
import { showScreen } from './screens.js';

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
    rotate: true,     
    touchRotate: true,   
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
  map.on("locationerror", onLocationError);
}

// Function to initialize map with a specific route
export function initializeMapWithRoute(newWaypoints) {
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

// Handle successful location detection
function onLocationFound(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  const accuracy = e.accuracy;

  userLocation = [lat, lng];

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

// Handle location errors
function onLocationError(e) {
  console.error("Location error:", e);
  
  // Reset tracking state
  isTracking = false;
  const startBtn = document.getElementById("start-tracking");
  if (startBtn) startBtn.disabled = false;
  
  // Handle different types of location errors
  let errorMessage = "";
  let showRetryOption = false;
  let isPermissionDenied = false;
  
  switch(e.code) {
    case 1: // PERMISSION_DENIED
      errorMessage = "Platståtkomst nekad. Du behöver tillåta platsdelning för att använda appen.";
      showRetryOption = true;
      isPermissionDenied = true;
      break;
    case 2: // POSITION_UNAVAILABLE
      errorMessage = "Din plats kunde inte fastställas. Kontrollera att GPS är aktiverat och försök igen.";
      showRetryOption = true;
      break;
    case 3: // TIMEOUT
      errorMessage = "Platshämtning tog för lång tid. Kontrollera din internetanslutning och försök igen.";
      showRetryOption = true;
      break;
    default:
      errorMessage = "Ett fel uppstod vid platshämtning. Försök igen.";
      showRetryOption = true;
  }
  
  showLocationErrorModal(errorMessage, showRetryOption, isPermissionDenied);
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

// Start location tracking with enhanced error handling
function startTracking() {
  if (!navigator.geolocation) {
    showLocationErrorModal("GPS är inte tillgängligt på denna enhet.", false);
    return;
  }

  // Check if we already denied permission before
  if (navigator.permissions) {
    navigator.permissions.query({name: 'geolocation'}).then(function(result) {
      if (result.state === 'denied') {
        showLocationErrorModal(
          "Platståtkomst är blockerad. Du behöver tillåta platsdelning för att använda appen.",
          true,
          true
        );
        return;
      }
      
      // Proceed with location tracking
      startLocationTracking();
    }).catch(() => {
      // Fallback if permissions API not supported
      startLocationTracking();
    });
  } else {
    // Fallback for browsers without permissions API
    startLocationTracking();
  }
}

// Separate the actual tracking logic
function startLocationTracking() {
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
export function markWaypointAsVisited(waypointIndex) {
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
export function resetWaypoints() {
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
}

// Stop location tracking
function stopTracking() {
  if (isTracking) {
    isTracking = false;
    map.stopLocate(); 
    
    const startBtn = document.getElementById("start-tracking");
    if (startBtn) startBtn.disabled = false;
  }
}

// Center map on user location
export function centerOnUser() {
  if (userLocation && map) {
    map.setView(userLocation, 18);
  } else {
    showLocationErrorModal("Plats inte tillgänglig", false);
  }
}

// Retry location access - check permission status first
export function retryLocationAccess() {
  hideLocationErrorModal();
  
  // Check permission status before retrying
  if (navigator.permissions) {
    navigator.permissions.query({name: 'geolocation'}).then(function(result) {
      if (result.state === 'denied') {
        // Still denied, show instructions again
        setTimeout(() => {
          showLocationErrorModal(
            "Platståtkomst är fortfarande blockerad.",
            true,
            true
          );
        }, 500);
        return;
      }
      
      // Permission is granted or prompt, try again
      setTimeout(() => {
        startTracking();
      }, 500);
    }).catch(() => {
      // Fallback - just try again
      setTimeout(() => {
        startTracking();
      }, 500);
    });
  } else {
    // Fallback for browsers without permissions API
    setTimeout(() => {
      startTracking();
    }, 500);
  }
}

// Go back to start screen (for permission denied errors)
export function goBackToStart() {
  hideLocationErrorModal();
  
  // Reset all selections and go back to start screen
  setTimeout(() => {
    // Reset form selections
    document.querySelectorAll('input[name="time"]').forEach((radio) => (radio.checked = false));
    document.querySelectorAll('input[name="difficulty"]').forEach((radio) => (radio.checked = false));
    
    // Update button state
    if (window.updateStartButtonState) {
      window.updateStartButtonState();
    }
    
    // Show start screen
    showScreen("start-screen");
  }, 300);
}

// Initialize map when called
export function initializeMap() {
  initMap();
}

// Make functions available globally
window.initializeMapWithRoute = initializeMapWithRoute;
window.markWaypointAsVisited = markWaypointAsVisited;
window.resetWaypoints = resetWaypoints;
window.centerOnUser = centerOnUser;
window.retryLocationAccess = retryLocationAccess;
window.goBackToStart = goBackToStart;
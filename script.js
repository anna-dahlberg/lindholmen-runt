import { waypoints } from "./locations.js";

let map;
let userLocationMarker;
let userLocation = null;
let waypointMarkers = [];
let trailCoordinates = [];
let trailPolyline;
const visitRadius = 50; // meters
let isTracking = false;

// Mobile-specific utilities
function vibrate(pattern = [100]) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

function showMobileNotification(message, type = 'success') {
    // Create custom mobile-friendly notification
    const notification = document.createElement('div');
    let bgColor;
    switch(type) {
        case 'success':
            bgColor = 'linear-gradient(135deg, #11998e, #38ef7d)';
            break;
        case 'error':
            bgColor = 'linear-gradient(135deg, #fc466b, #3f5efb)';
            break;
        case 'info':
            bgColor = 'linear-gradient(135deg, #667eea, #764ba2)';
            break;
        default:
            bgColor = 'linear-gradient(135deg, #11998e, #38ef7d)';
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
    notification.style.opacity = '0';
    notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
    setTimeout(() => {
        notification.style.transition = 'all 0.3s ease';
        notification.style.opacity = '1';
        notification.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);

    // Remove after delay
    const duration = type === 'info' ? 2000 : 3000;
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);

    return notification;
}

// Initialize map
function initMap() {
    // Create map centered on first waypoint
    map = L.map('map', {
        zoomControl: false, // Remove zoom controls for mobile
        attributionControl: false // Remove attribution for cleaner mobile UI
    }).setView(waypoints[0].coordinates, 16);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    addWaypoints();
    updateWaypointList();
    
    // Initialize trail polyline
    trailPolyline = L.polyline([], {
        color: '#ff3366',
        weight: 4,
        opacity: 0.8
    }).addTo(map);

    // Add mobile-specific map interactions
    map.on('dragstart', () => {
        // Prevent scrolling while dragging map
        document.body.style.overflow = 'hidden';
    });

    map.on('dragend', () => {
        document.body.style.overflow = '';
    });

    // Set up Leaflet location event handlers
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
}

// Handle successful location detection
function onLocationFound(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    const accuracy = e.accuracy;
    
    userLocation = [lat, lng];
    
    console.log(`Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}, Accuracy: ${accuracy}m`);
    
    // Add to trail
    trailCoordinates.push(userLocation);
    
    // Update trail polyline (check if initialized)
    if (trailPolyline && document.getElementById('show-trail').checked) {
        trailPolyline.setLatLngs(trailCoordinates);
    }
    
    // Update or create user location marker
    if (userLocationMarker) {
        userLocationMarker.setLatLng(userLocation);
        // Update popup with current coordinates
        userLocationMarker.setPopupContent(`
            <h4>📍 Your Location</h4>
            <p>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}<br>Accuracy: ${Math.round(accuracy)}m</p>
        `);
    } else {
        const userIcon = L.divIcon({
            className: '',
            html: '<div class="user-marker"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        userLocationMarker = L.marker(userLocation, { icon: userIcon })
            .addTo(map)
            .bindPopup(`
                <h4>📍 Your Location</h4>
                <p>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}<br>Accuracy: ${Math.round(accuracy)}m</p>
            `);
        
        // Center map on user location initially with higher zoom
        map.setView(userLocation, 18);
        
        // Show success message on first location
        showMobileNotification('🎯 GPS tracking started!');
        
        // Show accuracy feedback
        if (accuracy > 100) {
            showMobileNotification(`⚠️ GPS accuracy: ${Math.round(accuracy)}m`, 'error');
        } else if (accuracy > 50) {
            showMobileNotification(`📡 GPS accuracy: ${Math.round(accuracy)}m`, 'info');
        }
    }
    
    checkWaypoints();
    updateDistanceInfo();
}

// Handle location detection errors
function onLocationError(e) {
    let message = '';
    switch(e.code) {
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
    console.error('Location error:', e);
    vibrate([300, 100, 300]);
    showMobileNotification(message, 'error');
    
    // Reset tracking state on error
    stopTracking();
}

// Add waypoints to map
function addWaypoints() {
    waypoints.forEach((waypoint, index) => {
        const markerClass = waypoint.visited ? 'waypoint-visited' : 
                          (index === 0 ? 'waypoint-start' : 'waypoint-pending');
        
        const icon = L.divIcon({
            className: '',
            html: `<div class="waypoint-marker ${markerClass}">${index + 1}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        
        const marker = L.marker(waypoint.coordinates, { icon: icon })
            .addTo(map)
            .bindPopup(`
                <h4>${waypoint.name}</h4>
                <p>${waypoint.description}</p>
                <small>Status: ${waypoint.visited ? '<strong style="color: green;">Visited ✓</strong>' : 'Pending'}</small>
            `);
        
        waypointMarkers.push(marker);
        waypoint.marker = marker;
    });
}

// Start location tracking using Leaflet's locate method
function startTracking() {
    if (!navigator.geolocation) {
        showMobileNotification('GPS not available on this device', 'error');
        return;
    }
    
    showMobileNotification('🔍 Getting your location...', 'info');
    isTracking = true;
    vibrate([100, 50, 100]);
    
    // Use Leaflet's locate method
    map.locate({
        watch: true,                // Continuously watch for location changes
        enableHighAccuracy: true,  // Use GPS for better accuracy
        timeout: 15000,            // Timeout after 15 seconds
        maximumAge: 0,             // Always get fresh location
        setView: false             // Don't automatically set view (we'll handle it)
    });
    
    document.getElementById('start-tracking').disabled = true;
    document.getElementById('stop-tracking').disabled = false;
    document.getElementById('center-user').disabled = false;
}

// Stop location tracking
function stopTracking() {
    isTracking = false;
    vibrate([200]);
    
    // Stop Leaflet's location watching
    map.stopLocate();
    
    document.getElementById('start-tracking').disabled = false;
    document.getElementById('stop-tracking').disabled = true;
    document.getElementById('center-user').disabled = true;
    
    showMobileNotification('⏹️ GPS tracking stopped');
}

// Update user location
function updateUserLocation(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    
    userLocation = [lat, lng];
    
    console.log(`Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}, Accuracy: ${accuracy}m`);
    
    // Add to trail
    trailCoordinates.push(userLocation);
    
    // Update trail polyline (check if initialized)
    if (trailPolyline && document.getElementById('show-trail').checked) {
        trailPolyline.setLatLngs(trailCoordinates);
    }
    
    // Update or create user location marker
    if (userLocationMarker) {
        userLocationMarker.setLatLng(userLocation);
        // Update popup with current coordinates
        userLocationMarker.setPopupContent(`
            <h4>📍 Your Location</h4>
            <p>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}<br>Accuracy: ${Math.round(accuracy)}m</p>
        `);
    } else {
        const userIcon = L.divIcon({
            className: '',
            html: '<div class="user-marker"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        userLocationMarker = L.marker(userLocation, { icon: userIcon })
            .addTo(map)
            .bindPopup(`
                <h4>📍 Your Location</h4>
                <p>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}<br>Accuracy: ${Math.round(accuracy)}m</p>
            `);
        
        // Center map on user location initially with higher zoom
        map.setView(userLocation, 18);
        
        // Show accuracy feedback
        if (accuracy > 100) {
            showMobileNotification(`⚠️ GPS accuracy: ${Math.round(accuracy)}m`, 'error');
        } else if (accuracy > 50) {
            showMobileNotification(`📡 GPS accuracy: ${Math.round(accuracy)}m`, 'info');
        }
    }
    
    checkWaypoints();
    updateDistanceInfo();
}

// Check if user has reached any waypoints
function checkWaypoints() {
    if (!userLocation) return;
    
    waypoints.forEach((waypoint, index) => {
        if (!waypoint.visited) {
            const distance = calculateDistance(
                userLocation[0], userLocation[1],
                waypoint.coordinates[0], waypoint.coordinates[1]
            );
            
            if (distance <= visitRadius) {
                waypoint.visited = true;
                
                // Mobile haptic feedback
                vibrate([200, 100, 200, 100, 200]);
                
                // Update marker appearance
                const newIcon = L.divIcon({
                    className: '',
                    html: `<div class="waypoint-marker waypoint-visited">${index + 1}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                
                waypoint.marker.setIcon(newIcon);
                waypoint.marker.setPopupContent(`
                    <h4>${waypoint.name} ✓</h4>
                    <p>${waypoint.description}</p>
                    <small>Status: <strong style="color: green;">Visited!</strong></small>
                `);
                
                updateWaypointList();
                
                // Show mobile-friendly completion message
                setTimeout(() => {
                    showMobileNotification(`🎯 ${waypoint.name} reached!`);
                    
                    // Check if all waypoints completed
                    if (waypoints.every(wp => wp.visited)) {
                        setTimeout(() => {
                            vibrate([300, 100, 300, 100, 300, 100, 300]);
                            showMobileNotification('🎉 All waypoints completed! Amazing!');
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
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

// Update waypoint list display (now compact with dots)
function updateWaypointList() {
    const progressText = document.getElementById('progress-text');
    const progressDots = document.getElementById('progress-dots');
    
    // Check if elements exist (they might not during initialization)
    if (!progressText || !progressDots) {
        return;
    }
    
    const visitedCount = waypoints.filter(wp => wp.visited).length;
    progressText.textContent = `Progress: ${visitedCount}/${waypoints.length}`;
    
    progressDots.innerHTML = '';
    waypoints.forEach((waypoint, index) => {
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        
        if (waypoint.visited) {
            dot.classList.add('visited');
        } else if (index === getNextWaypointIndex()) {
            dot.classList.add('current');
        }
        
        progressDots.appendChild(dot);
    });
}

// Get next unvisited waypoint index
function getNextWaypointIndex() {
    return waypoints.findIndex(wp => !wp.visited);
}

// Update distance information
function updateDistanceInfo() {
    const distanceElement = document.getElementById('distance-info');
    
    // Check if element exists
    if (!distanceElement) {
        return;
    }
    
    if (!userLocation) {
        distanceElement.innerHTML = '<strong>Distance to next: --</strong>';
        return;
    }
    
    const nextIndex = getNextWaypointIndex();
    if (nextIndex === -1) {
        distanceElement.innerHTML = '<strong>🎉 All waypoints completed!</strong>';
        return;
    }
    
    const nextWaypoint = waypoints[nextIndex];
    const distance = calculateDistance(
        userLocation[0], userLocation[1],
        nextWaypoint.coordinates[0], nextWaypoint.coordinates[1]
    );
    
    distanceElement.innerHTML = `
        <strong>Next: ${nextWaypoint.name}</strong><br>
        Distance: ${Math.round(distance)}m
    `;
}

// Reset waypoints and trail
function resetWaypoints() {
    vibrate([100, 50, 100]);
    
    waypoints.forEach((waypoint, index) => {
        waypoint.visited = false;
        
        const markerClass = index === 0 ? 'waypoint-start' : 'waypoint-pending';
        const newIcon = L.divIcon({
            className: '',
            html: `<div class="waypoint-marker ${markerClass}">${index + 1}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        
        waypoint.marker.setIcon(newIcon);
        waypoint.marker.setPopupContent(`
            <h4>${waypoint.name}</h4>
            <p>${waypoint.description}</p>
            <small>Status: Pending</small>
        `);
    });
    
    // Clear trail
    trailCoordinates = [];
    trailPolyline.setLatLngs([]);
    
    updateWaypointList();
    updateDistanceInfo();
    
    showMobileNotification('🔄 Reset complete!');
}

// Set waypoints around user's current location
function setWaypointsAroundUser() {
    if (!userLocation) {
        showMobileNotification('📍 Start tracking first to get your location', 'error');
        return;
    }

    vibrate([100, 50, 100]);
    
    const [userLat, userLng] = userLocation;
    
    // Create waypoints in a small area around user (roughly 100-200m apart)
    const newWaypoints = [
        {
            id: 1,
            name: "Start Point",
            coordinates: [userLat, userLng],
            visited: false,
            description: "Begin your journey here"
        },
        {
            id: 2,
            name: "Checkpoint A",
            coordinates: [userLat + 0.0015, userLng + 0.0010], // ~150m north-east
            visited: false,
            description: "First checkpoint"
        },
        {
            id: 3,
            name: "Checkpoint B",
            coordinates: [userLat + 0.0020, userLng - 0.0015], // ~200m north-west
            visited: false,
            description: "Second checkpoint"
        },
        {
            id: 4,
            name: "Final Destination",
            coordinates: [userLat - 0.0010, userLng + 0.0020], // ~150m south-east
            visited: false,
            description: "Complete your journey here!"
        }
    ];

    // Clear existing waypoint markers
    waypointMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    waypointMarkers = [];

    // Update waypoints array
    waypoints.length = 0;
    waypoints.push(...newWaypoints);

    // Add new waypoints to map
    addWaypoints();
    updateWaypointList();
    updateDistanceInfo();

    showMobileNotification('📌 Waypoints set around your location!');
}

// Center map on user location
function centerOnUser() {
    if (userLocation) {
        map.setView(userLocation, 17);
        vibrate([50]);
        showMobileNotification('📍 Centered on your location');
    }
}


// Toggle trail visibility
function toggleTrail() {
    // Check if trailPolyline is initialized
    if (!trailPolyline) {
        return;
    }
    
    const showTrail = document.getElementById('show-trail').checked;
    if (showTrail) {
        trailPolyline.setLatLngs(trailCoordinates);
    } else {
        trailPolyline.setLatLngs([]);
    }
}

// Initialize the app when page loads
function initializeApp() {
    initMap();
    
    // Add event listeners after map is initialized
    const startBtn = document.getElementById('start-tracking');
    const stopBtn = document.getElementById('stop-tracking');
    const resetBtn = document.getElementById('reset-waypoints');
    const centerBtn = document.getElementById('center-user');
    const setWaypointsBtn = document.getElementById('set-waypoints');
    const trailToggle = document.getElementById('show-trail');
    
    if (startBtn) startBtn.addEventListener('click', startTracking);
    if (stopBtn) stopBtn.addEventListener('click', stopTracking);
    if (resetBtn) resetBtn.addEventListener('click', resetWaypoints);
    if (centerBtn) centerBtn.addEventListener('click', centerOnUser);
    if (setWaypointsBtn) setWaypointsBtn.addEventListener('click', setWaypointsAroundUser);
    if (trailToggle) trailToggle.addEventListener('change', toggleTrail);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
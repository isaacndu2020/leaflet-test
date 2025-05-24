/* 
 * MAP INITIALIZATION
 * Creates a Leaflet map instance with zoom constraints
 */
const map = L.map('map', {
  maxZoom: 18,  // Maximum zoom level (street-level detail)
  minZoom: 1    // Minimum zoom level (world view)
}).setView([30, 0], 2); // Center map at 30°N, 0°E with zoom level 2

/*
 * BASE MAP LAYER
 * Adds colorful Esri WorldStreetMap tiles
 */
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri'  // Required attribution for map tiles
}).addTo(map);

/*
 * DATA STORAGE
 * Array to store all saved locations with their metadata
 */
const savedLocations = [];  // Format: { lat, lng, name, type }

/* 
 * SEARCH CONTROL SETUP
 * Configures the geocoder (search bar) using OpenStreetMap's Nominatim service
 */
const geocoder = L.Control.geocoder({
  position: 'topright',      // Position on map
  placeholder: 'Search locations...',  // Input placeholder text
  errorMessage: 'Not found', // Error message when location not found
  showResultIcons: true,     // Shows icons in search results
  geocoder: L.Control.Geocoder.nominatim({  // Uses OpenStreetMap's geocoder
    geocodingQueryParams: {
      countrycodes: '',  // Empty string enables global search
      limit: 5          // Maximum number of results to show
    }
  })
}).addTo(map);

/*
 * SEARCH RESULT HANDLER
 * Processes geocoder results when a location is searched
 */
geocoder.on('markgeocode', function(e) {
  const locationData = e.geocode;    // Contains geocoded result
  const center = locationData.center; // [lat, lng] of result
  const name = locationData.name;    // Human-readable location name
  const bounds = locationData.bbox;  // Bounding box for zooming

  // 1. Zoom to the location with padding
  map.fitBounds(bounds, { padding: [50, 50] });
  
  // 2. Add a semi-transparent blue circle (500m radius) around the location
  L.circle(center, {
    radius: 500,        // 500 meter radius
    color: '#3388ff',   // Blue border
    fillOpacity: 0.2    // Semi-transparent fill
  }).addTo(map);
  
  // 3. Add a marker at the exact center with popup info
  L.marker(center)
    .addTo(map)
    .bindPopup(`
      <b>${name}</b><br>
      Lat: ${center.lat.toFixed(4)}<br>
      Lng: ${center.lng.toFixed(4)}
    `)
    .openPopup();
  
  // 4. Save the searched location to history
  savedLocations.push({
    lat: center.lat,
    lng: center.lng,
    name: name,
    type: 'search'  // Distinguishes searched vs clicked locations
  });
});

/*
 * MAP CLICK HANDLER
 * Adds markers and fetches location names when map is clicked
 */
map.on('click', async function(event) {
  const coords = event.latlng;  // Click coordinates { lat, lng }
  const lat = coords.lat;
  const lng = coords.lng;
  
  try {
    // Fetch location name from OpenStreetMap's reverse geocoding API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    const name = data.display_name || "Unnamed Location";  // Fallback if no name
    
    // Add marker with popup at clicked location
    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`
        <b>${name}</b><br>
        Lat: ${lat.toFixed(4)}<br>
        Lng: ${lng.toFixed(4)}
      `)
      .openPopup();
    
    // Save clicked location to history
    savedLocations.push({ 
      lat, 
      lng, 
      name, 
      type: 'click'  // Distinguishes from searched locations
    });
    
  } catch (error) {
    console.error('Reverse geocode failed:', error);
    
    // Fallback marker if API request fails
    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(`
        <b>Unnamed Location</b><br>
        Lat: ${lat.toFixed(4)}<br>
        Lng: ${lng.toFixed(4)}
      `)
      .openPopup();
      
    savedLocations.push({ 
      lat, 
      lng, 
      name: "Unknown Location", 
      type: 'click' 
    });
  }
});

/* 
 * EXPORT FUNCTIONALITY
 * Converts saved locations to JSON and triggers download
 */
document.getElementById('exportBtn').addEventListener('click', () => {
  // Check if there are locations to export
  if (savedLocations.length === 0) {
    alert("No locations to export!");
    return;
  }
  
  // Convert to formatted JSON
  const data = JSON.stringify(savedLocations, null, 2);  // 2-space indentation
  
  // Create downloadable file
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Programmatically click an invisible download link
  const a = document.createElement('a');
  a.href = url;
  a.download = 'locations.json';  // Default filename
  a.click();  // Triggers download
  
  // Clean up memory
  URL.revokeObjectURL(url);
});
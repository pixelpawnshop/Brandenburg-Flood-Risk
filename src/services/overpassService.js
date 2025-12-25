/**
 * Overpass API Service
 * Fetches building data from OpenStreetMap using the Overpass API
 */

// Alternative Overpass API endpoints
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter'
];

/**
 * Fetch all buildings within a polygon area with retry logic
 * @param {Array<Array<number>>} polygon - Array of [lat, lng] coordinates
 * @returns {Promise<Object>} Overpass API response with building elements
 */
export async function fetchBuildingsInPolygon(polygon) {
  // Convert polygon coordinates to latitude longitude format with spaces
  const coordinates = polygon.map(coord => `${coord[0]} ${coord[1]}`).join(' ');

  // Construct the Overpass API query for ALL buildings
  const query = `[out:json][timeout:90];
  (
    way["building"](poly:"${coordinates}");
    relation["building"](poly:"${coordinates}");
  );
  out body;
  >;
  out skel qt;`;

  // Encode the query
  const encodedQuery = encodeURIComponent(query)
    .replace(/%20/g, ' ')
    .replace(/%3B/g, ';')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%3A/g, ':')
    .replace(/%3C/g, '<')
    .replace(/%3E/g, '>')
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')
    .replace(/%22/g, '"');

  // Try each endpoint with retries
  let lastError;
  
  for (let endpointIndex = 0; endpointIndex < OVERPASS_ENDPOINTS.length; endpointIndex++) {
    const endpoint = OVERPASS_ENDPOINTS[endpointIndex];
    const url = `${endpoint}?data=${encodedQuery}`;
    
    // Try this endpoint up to 2 times
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Fetching from ${endpoint} (attempt ${attempt + 1})`);
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        
        // Handle specific error codes
        if (response.status === 429) {
          // Rate limited, wait and retry
          console.warn('Rate limited, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        
        if (response.status === 504 || response.status === 503) {
          // Timeout or unavailable, try next endpoint
          console.warn(`Server timeout (${response.status}), trying alternative...`);
          lastError = new Error(`Server timeout. The selected area might be too large. Try a smaller polygon.`);
          break; // Try next endpoint
        }
        
        lastError = new Error(`Overpass API request failed with status ${response.status}`);
        
      } catch (error) {
        console.error(`Error with ${endpoint}:`, error);
        lastError = error;
        
        // Wait before retry
        if (attempt < 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }
  
  // All endpoints failed
  throw lastError || new Error('All Overpass API endpoints failed. Please try a smaller area or try again later.');
}

/**
 * Process Overpass API response to extract building information
 * @param {Object} overpassData - Raw Overpass API response
 * @returns {Array<Object>} Array of building objects with coordinates and properties
 */
export function processBuildings(overpassData) {
  const buildings = [];
  const nodeMap = new Map();
  
  // First, create a map of all nodes
  overpassData.elements.forEach(element => {
    if (element.type === 'node') {
      nodeMap.set(element.id, { lat: element.lat, lon: element.lon });
    }
  });
  
  // Process ways (buildings are typically ways)
  overpassData.elements.forEach(element => {
    if (element.type === 'way' && element.tags && element.tags.building) {
      // Calculate centroid from nodes
      if (element.nodes && element.nodes.length > 0) {
        const coords = element.nodes
          .map(nodeId => nodeMap.get(nodeId))
          .filter(coord => coord !== undefined);
        
        if (coords.length > 0) {
          // Simple centroid calculation (average of all coordinates)
          const centroid = {
            lat: coords.reduce((sum, c) => sum + c.lat, 0) / coords.length,
            lon: coords.reduce((sum, c) => sum + c.lon, 0) / coords.length
          };
          
          buildings.push({
            id: element.id,
            type: element.tags.building,
            name: element.tags.name || null,
            amenity: element.tags.amenity || null,
            centroid: centroid,
            nodes: coords,
            tags: element.tags
          });
        }
      }
    }
  });
  
  return buildings;
}

/**
 * Categorize building type into broader categories
 * @param {string} buildingType - OSM building tag value
 * @returns {string} Category name
 */
export function categorizeBuildingType(buildingType) {
  const residential = ['house', 'residential', 'apartments', 'detached', 'semidetached_house', 'terrace', 'bungalow', 'dormitory'];
  const commercial = ['commercial', 'retail', 'office', 'supermarket', 'shop'];
  const industrial = ['industrial', 'warehouse', 'manufacture', 'factory'];
  const publicBuildings = ['public', 'government', 'civic', 'townhall'];
  const infrastructure = ['hospital', 'school', 'university', 'college', 'kindergarten', 'church', 'cathedral', 'mosque', 'temple', 'synagogue'];
  
  if (residential.includes(buildingType)) return 'Residential';
  if (commercial.includes(buildingType)) return 'Commercial';
  if (industrial.includes(buildingType)) return 'Industrial';
  if (publicBuildings.includes(buildingType)) return 'Public';
  if (infrastructure.includes(buildingType)) return 'Infrastructure';
  
  return 'Other';
}

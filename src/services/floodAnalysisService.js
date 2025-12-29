/**
 * Flood Analysis Service
 * Queries Brandenburg WMS service to determine flood risk for buildings
 * Uses WMS GetMap + Canvas pixel analysis for fast processing
 */

const WMS_BASE_URL = 'https://maps.brandenburg.de/services/wms/hwrg';

const FLOOD_LAYERS = {
  extreme: 'Hochwasserrisikogebiete_BB_HQ-extrem',
  high: 'Hochwasserrisikogebiete_BB_HQ-hoch',
  medium: 'Hochwasserrisikogebiete_BB_HQ-mittel'
};

// Image size for WMS GetMap requests
const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 800;

/**
 * Load WMS flood layer image into canvas
 * @param {string} layer - WMS layer name
 * @param {Object} bounds - Map bounds {_northEast, _southWest}
 * @returns {Promise<Object>} Canvas context and bounds info
 */
async function loadFloodLayerImage(layer, bounds) {
  const bbox = `${bounds._southWest.lng},${bounds._southWest.lat},${bounds._northEast.lng},${bounds._northEast.lat}`;
  
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: layer,
    STYLES: '',
    BBOX: bbox,
    WIDTH: IMAGE_WIDTH,
    HEIGHT: IMAGE_HEIGHT,
    FORMAT: 'image/png',
    TRANSPARENT: 'TRUE',
    SRS: 'EPSG:4326'
  });
  
  const url = `${WMS_BASE_URL}?${params.toString()}`;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = IMAGE_WIDTH;
      canvas.height = IMAGE_HEIGHT;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      
      resolve({
        ctx: ctx,
        bounds: bounds,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT
      });
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load WMS image for layer ${layer}`));
    };
    
    img.src = url;
  });
}

/**
 * Check if a point is flooded by analyzing pixel color
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Object} imageData - Canvas context and bounds from loadFloodLayerImage
 * @returns {boolean} True if point is in flood zone
 */
function isPointFlooded(lat, lon, imageData) {
  const { ctx, bounds, width, height } = imageData;
  
  // Convert lat/lon to pixel coordinates
  const x = Math.floor(((lon - bounds._southWest.lng) / (bounds._northEast.lng - bounds._southWest.lng)) * width);
  const y = Math.floor(((bounds._northEast.lat - lat) / (bounds._northEast.lat - bounds._southWest.lat)) * height);
  
  // Check bounds
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return false;
  }
  
  // Get pixel color (RGBA)
  const pixelData = ctx.getImageData(x, y, 1, 1).data;
  const r = pixelData[0];
  const g = pixelData[1];
  const b = pixelData[2];
  const a = pixelData[3];
  
  // If pixel has any color and is not transparent, it's flooded
  // Transparent pixels (alpha = 0) mean no flood risk
  return a > 10 && (r > 10 || g > 10 || b > 10);
}

/**
 * Analyze flood risk for multiple buildings with progress updates
 * Uses WMS GetMap + canvas pixel analysis for fast processing
 * @param {Array<Object>} buildings - Array of building objects
 * @param {Object} mapBounds - Current map bounds
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Array<Object>>} Buildings with flood risk assessments
 */
export async function analyzeBuildingsFloodRisk(buildings, mapBounds, onProgress) {
  const results = [];
  const total = buildings.length;
  
  try {
    // Step 1: Load flood layer images
    if (onProgress) {
      onProgress({
        current: 0,
        total: total,
        message: 'Loading flood risk maps...'
      });
    }
    
    const [extremeImage, highImage, mediumImage] = await Promise.all([
      loadFloodLayerImage(FLOOD_LAYERS.extreme, mapBounds),
      loadFloodLayerImage(FLOOD_LAYERS.high, mapBounds),
      loadFloodLayerImage(FLOOD_LAYERS.medium, mapBounds)
    ]);
    
    if (onProgress) {
      onProgress({
        current: 0,
        total: total,
        message: 'Analyzing buildings...'
      });
    }
    
    // Step 2: Check each building against flood images
    buildings.forEach((building, index) => {
      const { lat, lon } = building.centroid;
      
      // Check flood status in each layer
      const isExtreme = isPointFlooded(lat, lon, extremeImage);
      const isHigh = isPointFlooded(lat, lon, highImage);
      const isMedium = isPointFlooded(lat, lon, mediumImage);
      
      let highestRisk = 'none';
      if (isMedium) highestRisk = 'medium';
      if (isHigh) highestRisk = 'high';
      if (isExtreme) highestRisk = 'extreme';
      
      results.push({
        ...building,
        floodRisk: {
          extreme: isExtreme,
          high: isHigh,
          medium: isMedium,
          highest: highestRisk
        }
      });
      
      // Update progress every 50 buildings
      if (onProgress && (index % 50 === 0 || index === total - 1)) {
        onProgress({
          current: index + 1,
          total: total,
          message: 'Analyzing buildings...'
        });
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('Error during flood analysis:', error);
    throw error;
  }
}

/**
 * Generate summary statistics from analyzed buildings
 * @param {Array<Object>} analyzedBuildings - Buildings with flood risk data
 * @returns {Object} Summary statistics
 */
export function generateFloodStatistics(analyzedBuildings) {
  const stats = {
    total: analyzedBuildings.length,
    affected: {
      extreme: 0,
      high: 0,
      medium: 0,
      any: 0
    },
    byType: {},
    byCategory: {}
  };
  
  analyzedBuildings.forEach(building => {
    const risk = building.floodRisk;
    
    // Count by risk level
    if (risk.extreme) stats.affected.extreme++;
    if (risk.high) stats.affected.high++;
    if (risk.medium) stats.affected.medium++;
    if (risk.highest !== 'none') stats.affected.any++;
    
    // Count by building type
    const type = building.type || 'unknown';
    if (!stats.byType[type]) {
      stats.byType[type] = { total: 0, affected: 0 };
    }
    stats.byType[type].total++;
    if (risk.highest !== 'none') {
      stats.byType[type].affected++;
    }
    
    // Count by category
    const category = building.category || 'Other';
    if (!stats.byCategory[category]) {
      stats.byCategory[category] = { total: 0, affected: 0 };
    }
    stats.byCategory[category].total++;
    if (risk.highest !== 'none') {
      stats.byCategory[category].affected++;
    }
  });
  
  return stats;
}

export { FLOOD_LAYERS, WMS_BASE_URL, loadFloodLayerImage, isPointFlooded };

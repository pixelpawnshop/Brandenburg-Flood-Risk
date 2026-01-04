import * as turf from '@turf/turf';
import { loadFloodLayerImage, isPointFlooded, FLOOD_LAYERS } from './floodAnalysisService';

// WFS Service Configuration
const WFS_URL = 'https://inspire.brandenburg.de/services/btlncir_wfs';

// Brandenburg Biotope Type Categories (based on BTK Brandenburg classification)
const BIOTOPE_CATEGORIES = {
  // Urban/Built-up areas (10000-12999)
  'urban': {
    label: 'Bebaute Gebiete / Built-up Areas',
    codes: ['10', '11', '12'],
    color: '#e31a1c',
    description: 'Settlements, industry, infrastructure'
  },
  // Agricultural areas (09000-09999)
  'agriculture': {
    label: 'Landwirtschaftsflächen / Agricultural Areas',
    codes: ['09'],
    color: '#ffff33',
    description: 'Cropland, orchards, vineyards'
  },
  // Grasslands (05000-05999)
  'grassland': {
    label: 'Grünland / Grassland',
    codes: ['05'],
    color: '#a6d96a',
    description: 'Meadows, pastures, grasslands'
  },
  // Forests (08000-08999)
  'forest': {
    label: 'Wälder / Forests',
    codes: ['08'],
    color: '#1b7837',
    description: 'Forests and woodlands'
  },
  // Shrubs and hedges (07000-07999)
  'shrubs': {
    label: 'Gebüsche / Shrubland',
    codes: ['07'],
    color: '#66c2a4',
    description: 'Shrubs, hedges, scrubland'
  },
  // Wetlands (04000-04999)
  'wetland': {
    label: 'Feuchtgebiete / Wetlands',
    codes: ['04'],
    color: '#4575b4',
    description: 'Marshes, swamps, bogs'
  },
  // Waters (02000-02999)
  'water': {
    label: 'Gewässer / Water Bodies',
    codes: ['02'],
    color: '#0571b0',
    description: 'Rivers, lakes, ponds'
  },
  // Open areas with little vegetation (03000-03999)
  'barren': {
    label: 'Offenland / Open Land',
    codes: ['03'],
    color: '#d9d9d9',
    description: 'Sand, gravel, rocks, bare soil'
  },
  // Ruderal vegetation (06000-06999)
  'ruderal': {
    label: 'Ruderalfluren / Ruderal Vegetation',
    codes: ['06'],
    color: '#fee08b',
    description: 'Ruderal areas, pioneer vegetation'
  }
};

/**
 * Convert lat/lng to EPSG:3857 (Web Mercator)
 */
function toEPSG3857(lat, lng) {
  const x = lng * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  return [x, y * 20037508.34 / 180];
}

/**
 * Categorize biotope based on code
 */
function categorizeBiotope(biotoptyp) {
  if (!biotoptyp) return 'other';
  
  const code = biotoptyp.substring(0, 2);
  
  for (const [key, category] of Object.entries(BIOTOPE_CATEGORIES)) {
    if (category.codes.includes(code)) {
      return key;
    }
  }
  
  return 'other';
}

/**
 * Fetch land cover data from Brandenburg BTLN WFS
 * @param {Array<Array<number>>} polygonLatLngs - Array of [lat, lng] coordinates
 * @returns {Promise<Object>} Land cover data with features
 */
export async function fetchLandCoverData(polygonLatLngs) {
  try {
    console.log('Fetching Brandenburg biotope data from WFS...');
    
    // Calculate bounding box from polygon
    const lats = polygonLatLngs.map(coord => coord[0]);
    const lngs = polygonLatLngs.map(coord => coord[1]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Transform to EPSG:3857 for WFS request
    const minCoord = toEPSG3857(minLat, minLng);
    const maxCoord = toEPSG3857(maxLat, maxLng);
    
    // WFS 2.0.0 bbox format: minx,miny,maxx,maxy,crs
    const bboxStr = `${minCoord[0]},${minCoord[1]},${maxCoord[0]},${maxCoord[1]},urn:ogc:def:crs:EPSG::3857`;
    
    // Build WFS request URL
    const wfsUrl = new URL(WFS_URL);
    wfsUrl.searchParams.set('service', 'WFS');
    wfsUrl.searchParams.set('version', '2.0.0');
    wfsUrl.searchParams.set('request', 'GetFeature');
    wfsUrl.searchParams.set('typeName', 'app:btlncir_fl');
    wfsUrl.searchParams.set('bbox', bboxStr);
    wfsUrl.searchParams.set('outputFormat', 'application/geo+json');

    console.log('WFS URL:', wfsUrl.toString());

    const response = await fetch(wfsUrl.toString());
    
    if (!response.ok) {
      throw new Error(`WFS request failed: ${response.status}`);
    }

    const geojson = await response.json();
    
    if (!geojson.features || !Array.isArray(geojson.features)) {
      console.warn('No features found in WFS response');
      return {
        features: [],
        totalCount: 0
      };
    }
    
    console.log(`Loaded ${geojson.features.length} biotope features`);

    // Parse features
    const features = geojson.features.map(feature => ({
      id: feature.id,
      type: feature.properties.biotoptyp || 'unknown',
      typeCode: feature.properties.biotoptyp8 || '',
      description: feature.properties.biotoptyp8_t || 'Unknown biotope type',
      category: categorizeBiotope(feature.properties.biotoptyp || ''),
      geometry: feature.geometry,
      legendCode: feature.properties.leg_code
    }));

    return {
      features,
      totalCount: features.length
    };

  } catch (error) {
    console.error('Error fetching biotope data:', error);
    throw error;
  }
}

/**
 * Calculate land cover statistics
 * @param {Object} landCoverData - Land cover data from fetchLandCoverData
 * @param {Array<Array<number>>} polygonLatLngs - Polygon coordinates
 * @param {Object} mapBounds - Leaflet map bounds
 * @param {Object} activeFloodLayers - Currently active flood layers
 * @returns {Promise<Object>} Land cover statistics
 */
export async function calculateLandCoverStatistics(landCoverData, polygonLatLngs, mapBounds, activeFloodLayers) {
  if (!landCoverData || landCoverData.totalCount === 0) {
    return {
      totalFeatures: 0,
      affectedByFlooding: 0,
      byCategory: {},
      byType: {},
      message: 'No biotope data available for this area'
    };
  }

  // Load only the currently selected flood layer
  let floodImage = null;
  try {
    if (activeFloodLayers.extreme) {
      floodImage = await loadFloodLayerImage(FLOOD_LAYERS.extreme, mapBounds);
    } else if (activeFloodLayers.high) {
      floodImage = await loadFloodLayerImage(FLOOD_LAYERS.high, mapBounds);
    } else if (activeFloodLayers.medium) {
      floodImage = await loadFloodLayerImage(FLOOD_LAYERS.medium, mapBounds);
    }
  } catch (error) {
    console.warn('Could not load flood layer for land cover analysis:', error);
  }

  // Group by category and type
  const byCategory = {};
  const byType = {};
  let totalAffected = 0;
  
  for (const feature of landCoverData.features) {
    const category = feature.category;
    const type = feature.description;
    
    // Initialize category
    if (!byCategory[category]) {
      byCategory[category] = {
        count: 0,
        affected: 0,
        label: BIOTOPE_CATEGORIES[category]?.label || category,
        color: BIOTOPE_CATEGORIES[category]?.color || '#999999',
        types: {}
      };
    }
    
    // Initialize type
    if (!byType[type]) {
      byType[type] = {
        count: 0,
        affected: 0,
        code: feature.type,
        category: category
      };
    }
    
    // Count features
    byCategory[category].count++;
    byType[type].count++;
    
    // Check flood affection using centroid
    let isAffected = false;
    if (floodImage && feature.geometry) {
      try {
        // Get centroid of the biotope polygon
        const centroid = turf.centroid(feature.geometry);
        const [lng, lat] = centroid.geometry.coordinates;
        
        // Check if centroid is flooded in the selected layer
        isAffected = isPointFlooded(lat, lng, floodImage);
      } catch (error) {
        // Skip flood check if error
      }
    }
    
    if (isAffected) {
      byCategory[category].affected++;
      byType[type].affected++;
      totalAffected++;
    }
  }

  return {
    totalFeatures: landCoverData.totalCount,
    affectedByFlooding: totalAffected,
    byCategory,
    byType,
    categories: BIOTOPE_CATEGORIES
  };
}

/**
 * Get category information
 */
export function getCategoryInfo(categoryKey) {
  return BIOTOPE_CATEGORIES[categoryKey] || {
    label: 'Unknown',
    color: '#999999',
    description: 'Unknown category'
  };
}

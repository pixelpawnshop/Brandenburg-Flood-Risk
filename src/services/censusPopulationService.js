/**
 * Census Population Service
 * Loads Brandenburg commune boundaries with census population data
 * and calculates affected population in analysis areas
 */

import * as turf from '@turf/turf';

let communesData = null;

/**
 * Load Brandenburg communes GeoJSON with census data
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function loadBrandenburgCommunes() {
  if (communesData) {
    return communesData;
  }
  
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}brandenburg_gemeinden_einwohner_3857.geojson`);
    if (!response.ok) {
      throw new Error('Failed to load communes data');
    }
    
    communesData = await response.json();
    console.log(`Loaded ${communesData.features.length} Brandenburg communes with census data`);
    return communesData;
  } catch (error) {
    console.error('Error loading communes data:', error);
    throw error;
  }
}

/**
 * Calculate population in a polygon area using census data
 * @param {Array<Array<number>>} polygonCoords - Polygon coordinates [[lat, lng], ...]
 * @returns {Promise<Object>} Population statistics
 */
export async function calculateCensusPopulation(polygonCoords) {
  const communes = await loadBrandenburgCommunes();
  
  // Convert Leaflet lat/lng to EPSG:3857 (Web Mercator) to match GeoJSON
  // Formula: https://en.wikipedia.org/wiki/Web_Mercator_projection
  const toEPSG3857 = (lat, lng) => {
    const x = lng * 20037508.34 / 180;
    const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    return [x, y * 20037508.34 / 180];
  };
  
  const polygonGeoJSON = turf.polygon([[
    ...polygonCoords.map(coord => toEPSG3857(coord[0], coord[1])),
    toEPSG3857(polygonCoords[0][0], polygonCoords[0][1]) // Close the polygon
  ]]);
  
  console.log('Analysis polygon coords sample:', polygonGeoJSON.geometry.coordinates[0].slice(0, 3));
  
  let totalPopulation = 0;
  const affectedCommunes = [];
  
  // Find communes that intersect with the polygon
  communes.features.forEach(commune => {
    try {
      // Skip if commune has no valid geometry
      if (!commune.geometry || !commune.geometry.coordinates || commune.geometry.coordinates.length === 0) {
        return;
      }
      
      // Check if commune intersects with analysis polygon using simpler boolean check
      let intersects = false;
      try {
        intersects = turf.booleanIntersects(commune, polygonGeoJSON);
      } catch (err) {
        // If boolean check fails, skip this commune
        console.warn('Intersection check failed for:', commune.properties.GEN);
        return;
      }
      
      if (intersects) {
        // Get population from census data property
        const communePopulation = parseInt(commune.properties['1000A-0000_de - 1000A-0000_de.csv_Anzahl'] || '0', 10);
        
        if (communePopulation > 0) {
          // For now, use a simplified approach: if any part intersects, count full population
          // This is less accurate but works around the intersection calculation issue
          totalPopulation += communePopulation;
          affectedCommunes.push({
            name: commune.properties.GEN || commune.properties.name || 'Unknown',
            population: communePopulation,
            overlapPercentage: 1.0, // Simplified: assume full overlap for now
            estimatedInArea: communePopulation
          });
        }
      }
    } catch (error) {
      // Skip communes with geometry issues
      console.warn('Error processing commune:', error);
    }
  });
  
  return {
    total: totalPopulation,
    communes: affectedCommunes,
    communeCount: affectedCommunes.length
  };
}

/**
 * Calculate affected population by flood risk
 * @param {Array<Object>} analyzedBuildings - Buildings with flood risk assessment
 * @param {Object} censusPopulation - Census population data for area
 * @returns {Object} Population statistics by flood scenario
 */
export function calculateFloodAffectedPopulation(analyzedBuildings, censusPopulation) {
  const totalBuildings = analyzedBuildings.length;
  const affectedByExtreme = analyzedBuildings.filter(b => b.floodRisk.extreme).length;
  const affectedByHigh = analyzedBuildings.filter(b => b.floodRisk.high).length;
  const affectedByMedium = analyzedBuildings.filter(b => b.floodRisk.medium).length;
  const affectedByAny = analyzedBuildings.filter(b => b.floodRisk.highest !== 'none').length;
  
  const totalPopulation = censusPopulation.total;
  
  return {
    total: totalPopulation,
    affected: {
      extreme: Math.round(totalPopulation * (affectedByExtreme / totalBuildings)),
      high: Math.round(totalPopulation * (affectedByHigh / totalBuildings)),
      medium: Math.round(totalPopulation * (affectedByMedium / totalBuildings)),
      any: Math.round(totalPopulation * (affectedByAny / totalBuildings))
    },
    communes: censusPopulation.communes
  };
}

/**
 * Calculate population density per km²
 * @param {number} population - Total population
 * @param {number} areaKm2 - Area in square kilometers
 * @returns {number} Population density
 */
export function calculatePopulationDensity(population, areaKm2) {
  if (areaKm2 <= 0) return 0;
  return Math.round(population / areaKm2);
}

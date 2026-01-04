/**
 * Transportation Service
 * Fetches road network data from OpenStreetMap and analyzes flood risk
 */

import { loadFloodLayerImage, isPointFlooded, FLOOD_LAYERS } from './floodAnalysisService';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter'
];

/**
 * Fetch transportation infrastructure within a polygon from OpenStreetMap
 */
export async function fetchTransportationInPolygon(polygon) {
  const coordinates = polygon.map(coord => `${coord[0]} ${coord[1]}`).join(' ');
  
  const query = `[out:json][timeout:90];
  (
    way["highway"](poly:"${coordinates}");
    relation["highway"](poly:"${coordinates}");
  );
  out body;
  >;
  out skel qt;`;

  // Try each endpoint in sequence until one succeeds
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i];
    
    try {
      console.log(`Fetching transportation data from endpoint ${i + 1}/${OVERPASS_ENDPOINTS.length}...`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Successfully fetched ${data.elements?.length || 0} elements from OSM`);
      return data;
      
    } catch (error) {
      console.warn(`Endpoint ${i + 1} failed:`, error.message);
      
      if (i === OVERPASS_ENDPOINTS.length - 1) {
        throw new Error(`All Overpass API endpoints failed. Last error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Process raw Overpass data into road objects with coordinates
 */
export function processTransportation(overpassData) {
  const roads = [];
  const nodeMap = new Map();
  
  // Build node coordinate map
  overpassData.elements.forEach(element => {
    if (element.type === 'node') {
      nodeMap.set(element.id, { lat: element.lat, lon: element.lon });
    }
  });
  
  // Process ways (roads)
  overpassData.elements.forEach(element => {
    if (element.type === 'way' && element.tags && element.tags.highway) {
      const coords = element.nodes
        .map(nodeId => nodeMap.get(nodeId))
        .filter(coord => coord !== undefined);
      
      if (coords.length < 2) return; // Need at least 2 points for a road segment
      
      roads.push({
        id: element.id,
        type: element.tags.highway,
        name: element.tags.name || null,
        ref: element.tags.ref || null,
        bridge: element.tags.bridge || null,
        tunnel: element.tags.tunnel || null,
        surface: element.tags.surface || null,
        nodes: coords,
        tags: element.tags
      });
    }
  });
  
  return roads;
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Sample points along a road segment every 50 meters
 */
function samplePointsAlongRoad(nodes, intervalMeters = 50) {
  const samples = [];
  
  for (let i = 0; i < nodes.length - 1; i++) {
    const start = nodes[i];
    const end = nodes[i + 1];
    
    // Always include the start point
    samples.push(start);
    
    // Calculate segment distance
    const segmentDistance = haversineDistance(start.lat, start.lon, end.lat, end.lon);
    
    // If segment is longer than interval, add intermediate points
    if (segmentDistance > intervalMeters) {
      const numIntermediate = Math.floor(segmentDistance / intervalMeters);
      
      for (let j = 1; j <= numIntermediate; j++) {
        const fraction = (j * intervalMeters) / segmentDistance;
        const lat = start.lat + (end.lat - start.lat) * fraction;
        const lon = start.lon + (end.lon - start.lon) * fraction;
        samples.push({ lat, lon });
      }
    }
  }
  
  // Always include the end point
  samples.push(nodes[nodes.length - 1]);
  
  return samples;
}

/**
 * Calculate total length of road in kilometers
 */
function calculateRoadLength(nodes) {
  let totalDistance = 0;
  
  for (let i = 0; i < nodes.length - 1; i++) {
    totalDistance += haversineDistance(
      nodes[i].lat, nodes[i].lon,
      nodes[i + 1].lat, nodes[i + 1].lon
    );
  }
  
  return totalDistance / 1000; // Convert to kilometers
}

/**
 * Analyze flood risk for transportation network
 */
export async function analyzeTransportationFloodRisk(roads, mapBounds, activeFloodLayers, onProgress) {
  console.log(`Analyzing flood risk for ${roads.length} road segments...`);
  
  // Load only the currently selected flood layer
  let floodImage = null;
  let activeLayerKey = null;
  
  if (activeFloodLayers.extreme) {
    floodImage = await loadFloodLayerImage(FLOOD_LAYERS.extreme, mapBounds);
    activeLayerKey = 'extreme';
  } else if (activeFloodLayers.high) {
    floodImage = await loadFloodLayerImage(FLOOD_LAYERS.high, mapBounds);
    activeLayerKey = 'high';
  } else if (activeFloodLayers.medium) {
    floodImage = await loadFloodLayerImage(FLOOD_LAYERS.medium, mapBounds);
    activeLayerKey = 'medium';
  }
  
  const analyzedRoads = [];
  
  roads.forEach((road, index) => {
    // Sample points along road every 50m
    const samplePoints = samplePointsAlongRoad(road.nodes, 50);
    
    // Check each sample point against the selected flood layer
    let affectedPoints = 0;
    
    if (floodImage) {
      samplePoints.forEach(point => {
        const isFlooded = isPointFlooded(point.lat, point.lon, floodImage);
        if (isFlooded) affectedPoints++;
      });
    }
    
    const totalLength = calculateRoadLength(road.nodes);
    const affectedPercentage = (affectedPoints / samplePoints.length) * 100;
    
    analyzedRoads.push({
      ...road,
      floodRisk: {
        totalSamplePoints: samplePoints.length,
        affectedPoints: affectedPoints,
        affectedPercentage: affectedPercentage,
        totalLength: totalLength,
        affectedLength: totalLength * (affectedPoints / samplePoints.length),
        isPartiallyFlooded: affectedPoints > 0,
        isMajorityFlooded: affectedPercentage > 50
      }
    });
    
    // Progress callback
    if (onProgress && (index % 100 === 0 || index === roads.length - 1)) {
      onProgress({
        current: index + 1,
        total: roads.length,
        message: `Analyzing roads: ${index + 1}/${roads.length}`
      });
    }
  });
  
  console.log(`Completed flood risk analysis for ${analyzedRoads.length} roads`);
  return analyzedRoads;
}

/**
 * Generate statistics from analyzed roads
 */
export function generateTransportationStatistics(analyzedRoads) {
  const stats = {
    total: analyzedRoads.length,
    totalLength: 0,
    affectedCount: 0,
    affectedLength: 0,
    byType: {},
    criticalInfrastructure: []
  };
  
  analyzedRoads.forEach(road => {
    const type = road.type;
    const length = road.floodRisk.totalLength;
    const affectedLength = road.floodRisk.affectedLength;
    const isAffected = road.floodRisk.isPartiallyFlooded;
    
    // Overall statistics
    stats.totalLength += length;
    if (isAffected) {
      stats.affectedCount++;
      stats.affectedLength += affectedLength;
    }
    
    // Statistics by road type
    if (!stats.byType[type]) {
      stats.byType[type] = {
        count: 0,
        totalLength: 0,
        affectedCount: 0,
        affectedLength: 0
      };
    }
    
    stats.byType[type].count++;
    stats.byType[type].totalLength += length;
    if (isAffected) {
      stats.byType[type].affectedCount++;
      stats.byType[type].affectedLength += affectedLength;
    }
    
    // Critical infrastructure (bridges/tunnels with >50% affected)
    if ((road.bridge || road.tunnel) && road.floodRisk.isMajorityFlooded) {
      stats.criticalInfrastructure.push({
        id: road.id,
        type: road.type,
        name: road.name || 'Unnamed',
        ref: road.ref,
        infrastructure: road.bridge ? 'Bridge' : 'Tunnel',
        affectedPercentage: road.floodRisk.affectedPercentage.toFixed(1),
        length: road.floodRisk.totalLength.toFixed(2)
      });
    }
  });
  
  return stats;
}

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import 'leaflet-geometryutil'
import { fetchBuildingsInPolygon, processBuildings, categorizeBuildingType } from '../services/overpassService'
import { analyzeBuildingsFloodRisk, generateFloodStatistics, WMS_BASE_URL, FLOOD_LAYERS } from '../services/floodAnalysisService'
import { calculateCensusPopulation, calculateFloodAffectedPopulation, calculatePopulationDensity } from '../services/censusPopulationService'
import { fetchLandCoverData, calculateLandCoverStatistics } from '../services/landCoverService'
import { fetchTransportationInPolygon, processTransportation, analyzeTransportationFloodRisk, generateTransportationStatistics } from '../services/transportationService'
import './FloodMap.css'

// Fix for default marker icons in Leaflet with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function FloodMap({ onAnalysisStart, onAnalysisComplete, onAnalysisError, onProgress }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const drawnItemsRef = useRef(null)
  const floodLayersRef = useRef({})
  const [activeFloodLayers, setActiveFloodLayers] = useState({
    extreme: true,
    high: false,
    medium: false
  })

  useEffect(() => {
    // Initialize map centered on Brandenburg
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView([52.4, 13.0], 8)
      
      // Add base layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map)
      
      // Add WMS flood layers
      const extremeLayer = L.tileLayer.wms(WMS_BASE_URL, {
        layers: FLOOD_LAYERS.extreme,
        format: 'image/png',
        transparent: true,
        opacity: 0.6,
        attribution: 'Brandenburg LfU',
        className: 'flood-layer-extreme'
      })
      
      const highLayer = L.tileLayer.wms(WMS_BASE_URL, {
        layers: FLOOD_LAYERS.high,
        format: 'image/png',
        transparent: true,
        opacity: 0.5,
        attribution: 'Brandenburg LfU',
        className: 'flood-layer-high'
      })
      
      const mediumLayer = L.tileLayer.wms(WMS_BASE_URL, {
        layers: FLOOD_LAYERS.medium,
        format: 'image/png',
        transparent: true,
        opacity: 0.4,
        attribution: 'Brandenburg LfU',
        className: 'flood-layer-medium'
      })
      
      // Add layers to map
      extremeLayer.addTo(map)
      highLayer.addTo(map)
      mediumLayer.addTo(map)
      
      floodLayersRef.current = {
        extreme: extremeLayer,
        high: highLayer,
        medium: mediumLayer
      }
      
      // Initialize FeatureGroup for drawn items
      const drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)
      drawnItemsRef.current = drawnItems
      
      // Initialize draw control
      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems,
          edit: false
        },
        draw: {
          polygon: {
            allowIntersection: false,
            shapeOptions: {
              color: '#3b82f6',
              weight: 3
            }
          },
          polyline: false,
          circle: false,
          circlemarker: false,
          marker: false,
          rectangle: {
            shapeOptions: {
              color: '#3b82f6',
              weight: 3
            }
          }
        }
      })
      map.addControl(drawControl)
      
      // Handle polygon creation
      map.on(L.Draw.Event.CREATED, async (e) => {
        const layer = e.layer
        drawnItems.addLayer(layer)
        
        const latlngs = layer.getLatLngs()[0].map((latlng) => [latlng.lat, latlng.lng])
        
        try {
          onAnalysisStart()
          onProgress({ current: 0, total: 0, message: 'Fetching buildings from OpenStreetMap...' })
          
          // Fetch buildings from OSM
          const osmData = await fetchBuildingsInPolygon(latlngs)
          const buildings = processBuildings(osmData)
          
          // Add category to each building
          buildings.forEach(building => {
            building.category = categorizeBuildingType(building.type)
          })
          
          onProgress({ 
            current: 0, 
            total: buildings.length, 
            message: `Found ${buildings.length} buildings. Starting flood risk analysis...` 
          })
          
          // Check if we have too many buildings
          if (buildings.length > 1000) {
            const proceed = window.confirm(
              `Found ${buildings.length} buildings. Analysis may take several minutes. Continue?`
            )
            if (!proceed) {
              drawnItems.removeLayer(layer)
              onAnalysisError(new Error('Analysis cancelled by user'))
              return
            }
          }
          
          // Analyze flood risk
          const mapBounds = map.getBounds()
          console.log('Active flood layers at analysis time:', activeFloodLayers)
          const analyzedBuildings = await analyzeBuildingsFloodRisk(
            buildings,
            mapBounds,
            activeFloodLayers,
            onProgress
          )
          
          // Calculate census-based population
          onProgress({
            current: analyzedBuildings.length,
            total: analyzedBuildings.length,
            message: 'Calculating population from census data...'
          })
          
          let censusPopulation = null
          let populationStats = null
          
          try {
            censusPopulation = await calculateCensusPopulation(latlngs)
            populationStats = calculateFloodAffectedPopulation(analyzedBuildings, censusPopulation)
          } catch (error) {
            console.warn('Could not load census data:', error)
            // Continue without population data
          }
          
          // Fetch and analyze land cover data
          onProgress({
            current: analyzedBuildings.length,
            total: analyzedBuildings.length,
            message: 'Analyzing land cover data...'
          })
          
          let landCoverStats = null
          
          try {
            const landCoverData = await fetchLandCoverData(latlngs)
            const mapBounds = map.getBounds()
            landCoverStats = await calculateLandCoverStatistics(landCoverData, latlngs, mapBounds, activeFloodLayers)
          } catch (error) {
            console.warn('Could not load land cover data:', error)
            // Continue without land cover data
          }
          
          // Analyze transportation network
          onProgress({
            current: analyzedBuildings.length,
            total: analyzedBuildings.length,
            message: 'Analyzing transportation network...'
          })
          
          let transportationStats = null
          
          try {
            const transportationData = await fetchTransportationInPolygon(latlngs)
            const roads = processTransportation(transportationData)
            const mapBounds = map.getBounds()
            const analyzedRoads = await analyzeTransportationFloodRisk(roads, mapBounds, activeFloodLayers, onProgress)
            transportationStats = generateTransportationStatistics(analyzedRoads)
          } catch (error) {
            console.warn('Could not load transportation data:', error)
            // Continue without transportation data
          }
          
          // Generate statistics
          const stats = generateFloodStatistics(analyzedBuildings)
          
          // Calculate area
          const areaInKm2 = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) / 1e6
          
          // Calculate population density if census data available
          const populationDensity = populationStats ? 
            calculatePopulationDensity(populationStats.total, areaInKm2) : null
          
          // Prepare results
          const results = {
            buildings: analyzedBuildings,
            statistics: stats,
            population: populationStats,
            landCover: landCoverStats,
            transportation: transportationStats,
            area: areaInKm2,
            populationDensity: populationDensity,
            polygon: latlngs
          }
          
          // Update popup on polygon
          let popupContent = `
            <strong>Analysis Complete</strong><br>
            Total Buildings: ${stats.total.toLocaleString()}<br>
            Affected by Flooding: ${stats.affected.any.toLocaleString()}<br>
            - HQ-extrem: ${stats.affected.extreme.toLocaleString()}<br>
            - HQ-hoch: ${stats.affected.high.toLocaleString()}<br>
            - HQ-mittel: ${stats.affected.medium.toLocaleString()}<br>
            Area: ${areaInKm2.toFixed(2)} km²`
          
          if (populationStats) {
            popupContent += `<br><br><strong>Census Population:</strong><br>
            Total: ${populationStats.total.toLocaleString()} residents<br>
            At Risk: ${populationStats.affected.any.toLocaleString()} residents<br>
            Density: ${populationDensity.toLocaleString()} residents/km²`
          }
          
          layer.bindPopup(popupContent).openPopup()
          
          onAnalysisComplete(results)
          
        } catch (error) {
          console.error('Error during analysis:', error)
          
          // Show user-friendly error message
          let errorMessage = 'Error during analysis. Please try again.';
          if (error.message.includes('timeout') || error.message.includes('too large')) {
            errorMessage = 'Area too large or server timeout. Please try a smaller polygon.';
          } else if (error.message.includes('Overpass')) {
            errorMessage = 'Unable to fetch building data. Please try again in a moment.';
          }
          
          layer.bindPopup(`<strong>Error</strong><br>${errorMessage}`).openPopup();
          onAnalysisError(error)
        }
      })
      
      mapInstanceRef.current = map
    }
    
    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])
  
  // Toggle flood layers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    
    Object.entries(activeFloodLayers).forEach(([key, isActive]) => {
      const layer = floodLayersRef.current[key]
      if (layer) {
        if (isActive && !map.hasLayer(layer)) {
          layer.addTo(map)
        } else if (!isActive && map.hasLayer(layer)) {
          map.removeLayer(layer)
        }
      }
    })
  }, [activeFloodLayers])
  
  const toggleFloodLayer = (layerName) => {
    setActiveFloodLayers({
      extreme: layerName === 'extreme',
      high: layerName === 'high',
      medium: layerName === 'medium'
    })
  }
  
  const clearDrawings = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
    }
    onAnalysisComplete(null)
  }

  return (
    <div className="flood-map-container">
      <div ref={mapRef} className="flood-map" />
      
      <div className="map-controls">
        <div className="layer-control">
          <h3>Flood Risk Layers</h3>
          <label>
            <input
              type="radio"
              name="floodLayer"
              checked={activeFloodLayers.extreme}
              onChange={() => toggleFloodLayer('extreme')}
            />
            <span className="layer-indicator extreme"></span>
            HQ-200
          </label>
          <label>
            <input
              type="radio"
              name="floodLayer"
              checked={activeFloodLayers.medium}
              onChange={() => toggleFloodLayer('medium')}
            />
            <span className="layer-indicator medium"></span>
            HQ-100
          </label>
          <label>
            <input
              type="radio"
              name="floodLayer"
              checked={activeFloodLayers.high}
              onChange={() => toggleFloodLayer('high')}
            />
            <span className="layer-indicator high"></span>
            HQ-10/20
          </label>
        </div>
        
        <button className="clear-button" onClick={clearDrawings}>
          Clear Analysis
        </button>
        
        <div className="instructions">
          <p><strong>Instructions:</strong></p>
          <p>1. Use the drawing tools to select an area</p>
          <p>2. Wait for the analysis to complete</p>
          <p>3. View results in the panel</p>
        </div>
      </div>
    </div>
  )
}

export default FloodMap

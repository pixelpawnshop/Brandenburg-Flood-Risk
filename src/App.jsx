import { useState } from 'react'
import FloodMap from './components/FloodMap'
import AnalysisResults from './components/AnalysisResults'
import './App.css'

function App() {
  const [analysisResults, setAnalysisResults] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌊 Brandenburg Flood Risk Assessment</h1>
        <p>Analyze building exposure to flood scenarios (HQ-extrem, HQ-hoch, HQ-mittel)</p>
      </header>
      
      <div className="app-content">
        <div className="map-container">
          <FloodMap 
            onAnalysisStart={() => setIsAnalyzing(true)}
            onAnalysisComplete={(results) => {
              setAnalysisResults(results)
              setIsAnalyzing(false)
              setProgress({ current: 0, total: 0, message: '' })
            }}
            onAnalysisError={(error) => {
              console.error('Analysis error:', error)
              setIsAnalyzing(false)
              setProgress({ current: 0, total: 0, message: '' })
            }}
            onProgress={setProgress}
          />
          
          {isAnalyzing && (
            <div className="progress-overlay">
              <div className="progress-content">
                <div className="spinner"></div>
                <p>{progress.message}</p>
                {progress.total > 0 && (
                  <p className="progress-stats">
                    Analyzing {progress.current} of {progress.total} buildings
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="results-container">
          <AnalysisResults results={analysisResults} />
        </div>
      </div>
      
      <footer className="app-footer">
        <p>
          Flood data: <a href="https://lfu.brandenburg.de/lfu/de/aufgaben/wasser/hochwasserschutz/hochwasserrisikomanagement/hochwasser-gefahren-und-risikokarten/" target="_blank" rel="noopener noreferrer">
            Brandenburg Landesamt für Umwelt (LfU)
          </a> | Building data: <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">
            OpenStreetMap
          </a> | Census data: <a href="https://ergebnisse.zensus2022.de/datenbank/online/statistic/1000A/table/1000A-0000" target="_blank" rel="noopener noreferrer">
            Zensus 2022
          </a> | Land use: <a href="https://inspire.brandenburg.de/services/btlncir_wfs" target="_blank" rel="noopener noreferrer">
            Brandenburg BTLN (LfU)
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App

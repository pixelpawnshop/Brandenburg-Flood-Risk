import { useState } from 'react'
import './AnalysisResults.css'

function AnalysisResults({ results }) {
  const [activeTab, setActiveTab] = useState('overview')
  
  if (!results) {
    return (
      <div className="analysis-results empty">
        <div className="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <h3>No Analysis Yet</h3>
          <p>Draw a polygon on the map to analyze building flood risk</p>
        </div>
      </div>
    )
  }
  
  const { statistics, area, buildings } = results
  
  const exportToCSV = () => {
    const headers = ['Building ID', 'Type', 'Category', 'Latitude', 'Longitude', 'HQ-extrem', 'HQ-hoch', 'HQ-mittel', 'Highest Risk']
    const rows = buildings.map(b => [
      b.id,
      b.type,
      b.category,
      b.centroid.lat.toFixed(6),
      b.centroid.lon.toFixed(6),
      b.floodRisk.extreme ? 'Yes' : 'No',
      b.floodRisk.high ? 'Yes' : 'No',
      b.floodRisk.medium ? 'Yes' : 'No',
      b.floodRisk.highest
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flood-risk-analysis-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const affectedPercentage = ((statistics.affected.any / statistics.total) * 100).toFixed(1)
  
  return (
    <div className="analysis-results">
      <div className="results-header">
        <h2>Analysis Results</h2>
        <button className="export-button" onClick={exportToCSV}>
          Export CSV
        </button>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'categories' ? 'active' : ''}
          onClick={() => setActiveTab('categories')}
        >
          By Category
        </button>
        <button 
          className={activeTab === 'types' ? 'active' : ''}
          onClick={() => setActiveTab('types')}
        >
          By Type
        </button>
      </div>
      
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="stat-card highlight">
            <div className="stat-value">{statistics.total.toLocaleString()}</div>
            <div className="stat-label">Total Buildings</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{area.toFixed(2)} km²</div>
            <div className="stat-label">Analysis Area</div>
          </div>
          
          <div className="stat-card alert">
            <div className="stat-value">{statistics.affected.any.toLocaleString()}</div>
            <div className="stat-label">Buildings at Risk ({affectedPercentage}%)</div>
          </div>
          
          <div className="flood-scenarios">
            <h3>Flood Scenarios</h3>
            <div className="scenario-item extreme">
              <div className="scenario-header">
                <span className="scenario-label">HQ-extrem</span>
                <span className="scenario-value">{statistics.affected.extreme.toLocaleString()}</span>
              </div>
              <div className="scenario-bar">
                <div 
                  className="scenario-fill extreme" 
                  style={{ width: `${(statistics.affected.extreme / statistics.total) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="scenario-item high">
              <div className="scenario-header">
                <span className="scenario-label">HQ-hoch</span>
                <span className="scenario-value">{statistics.affected.high.toLocaleString()}</span>
              </div>
              <div className="scenario-bar">
                <div 
                  className="scenario-fill high" 
                  style={{ width: `${(statistics.affected.high / statistics.total) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="scenario-item medium">
              <div className="scenario-header">
                <span className="scenario-label">HQ-mittel</span>
                <span className="scenario-value">{statistics.affected.medium.toLocaleString()}</span>
              </div>
              <div className="scenario-bar">
                <div 
                  className="scenario-fill medium" 
                  style={{ width: `${(statistics.affected.medium / statistics.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'categories' && (
        <div className="tab-content">
          <h3>Buildings by Category</h3>
          <div className="category-list">
            {Object.entries(statistics.byCategory)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([category, data]) => (
                <div key={category} className="category-item">
                  <div className="category-header">
                    <span className="category-name">{category}</span>
                    <span className="category-count">{data.total.toLocaleString()}</span>
                  </div>
                  <div className="category-affected">
                    At risk: {data.affected.toLocaleString()} ({((data.affected / data.total) * 100).toFixed(1)}%)
                  </div>
                  <div className="category-bar">
                    <div 
                      className="category-bar-fill" 
                      style={{ width: `${(data.affected / data.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {activeTab === 'types' && (
        <div className="tab-content">
          <h3>Buildings by Type</h3>
          <div className="type-list">
            {Object.entries(statistics.byType)
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 20)
              .map(([type, data]) => (
                <div key={type} className="type-item">
                  <div className="type-row">
                    <span className="type-name">
                      {type === 'yes' ? 'Building (type unknown)' : type}
                    </span>
                    <span className="type-stats">
                      {data.total} total, {data.affected} at risk
                    </span>
                  </div>
                </div>
              ))}
          </div>
          {Object.keys(statistics.byType).length > 20 && (
            <p className="type-note">Showing top 20 types. Export CSV for complete data.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default AnalysisResults

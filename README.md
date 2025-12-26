# 🌊 Brandenburg Flood Risk Assessment

A web application for analyzing building exposure to flood risk scenarios in Brandenburg, Germany. This tool integrates official flood hazard maps from the Brandenburg State Environment Agency (LfU) with OpenStreetMap building data to provide comprehensive flood risk assessments.

## 🎯 Features

- **Interactive Map**: Draw polygons to select analysis areas anywhere in Brandenburg
- **Official Flood Data**: Integrates WMS layers from Brandenburg LfU showing three flood scenarios:
  - HQ-extrem (High probability flood events)
  - HQ-hoch (Medium-high probability)
  - HQ-mittel (Medium probability)
- **Building Analysis**: Automatically fetches all buildings within selected areas from OpenStreetMap
- **Risk Assessment**: Determines which buildings are affected by each flood scenario
- **Detailed Statistics**: 
  - Total buildings analyzed
  - Buildings at risk by scenario
  - Breakdown by building category (Residential, Commercial, Industrial, etc.)
  - Breakdown by specific building types
- **Data Export**: Export complete analysis results to CSV format

## 🚀 Live Demo

[View Live Application](https://pixelpawnshop.github.io/Brandenburg-Flood-Risk/)

## 🛠️ Technology Stack

- **Frontend**: React 18 with Vite
- **Mapping**: Leaflet with Leaflet.draw for polygon drawing
- **Data Sources**:
  - Brandenburg LfU WMS Service for flood hazard maps
  - Overpass API for OpenStreetMap building data
- **Deployment**: GitHub Pages with automated GitHub Actions workflow

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/pixelpawnshop/Brandenburg-Flood-Risk.git
cd Brandenburg-Flood-Risk
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will open at `http://localhost:3000`

## 🔧 Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 🚢 Deployment to GitHub Pages

1. Update the `base` path in `vite.config.js` to match your repository name:
```javascript
base: '/your-repo-name/',
```

2. Deploy to GitHub Pages:
```bash
npm run deploy
```

Or set up automated deployment with GitHub Actions (workflow included in `.github/workflows/deploy.yml`)

## 📊 How It Works

1. **Draw Analysis Area**: Use the polygon or rectangle tools to select an area on the map
2. **Fetch Buildings**: The app queries OpenStreetMap's Overpass API to get all buildings in the selected area
3. **Flood Risk Analysis**: For each building centroid, the app queries the Brandenburg WMS service to determine if it falls within any flood hazard zones
4. **View Results**: Detailed statistics are displayed showing:
   - Total buildings and affected buildings
   - Breakdown by flood scenario
   - Categorization by building type
5. **Export Data**: Download complete results as CSV for further analysis

## 🗺️ Data Sources & Attribution

- **Flood Hazard Maps**: [Brandenburg Landesamt für Umwelt (LfU)](https://lfu.brandenburg.de/lfu/de/aufgaben/wasser/hochwasserschutz/hochwasserrisikomanagement/hochwasser-gefahren-und-risikokarten/)
- **Building Data**: [OpenStreetMap](https://www.openstreetmap.org) contributors
- **Base Map**: OpenStreetMap

## 📝 Future Enhancements

Potential improvements for consideration:
- Integration of additional infrastructure layers (Deiche/levees)
- Population density overlay for impact estimation
- Historical flood event markers
- Damage cost estimation models
- Support for custom flood scenarios

## 📄 License

MIT License - feel free to use this project for learning purposes.

---

**Note**: This application uses publicly available data sources. For official flood risk assessments and planning decisions, please consult the Brandenburg Landesamt für Umwelt directly.

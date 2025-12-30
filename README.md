# 🌊 Brandenburg Flood Risk Assessment

A web application for analyzing building exposure to flood risk scenarios in Brandenburg, Germany. This tool integrates official flood hazard maps from the Brandenburg State Environment Agency (LfU) with OpenStreetMap building data to provide comprehensive flood risk assessments.

## 🎯 Features

- **Interactive Map**: Draw polygons to select analysis areas anywhere in Brandenburg
- **Official Flood Data**: Integrates WMS layers from Brandenburg LfU showing three flood scenarios:
  - HQ-extrem 
  - HQ-hoch 
  - HQ-mittel
- **Building Analysis**: Automatically fetches all buildings within selected areas from OpenStreetMap
- **Risk Assessment**: Determines which buildings are affected by each flood scenario
- **Land Cover Analysis**: Integrates Brandenburg BTLN (Biotop- und Landnutzungskartierung) data to assess flood impact on different land use types (forests, grassland, wetlands, etc.)
- **Census Population Integration**: Calculates actual population in analysis areas using official 2022 German census data
  - Accurate population counts by commune intersection
  - Population at risk estimation based on affected buildings
  - Population density calculation per km²
  - List of affected communes with population breakdown
- **Detailed Statistics**: 
  - Total buildings analyzed
  - Buildings at risk by scenario
  - Census population in analysis area
  - Estimated residents at risk
  - Breakdown by building category (Residential, Commercial, Industrial, etc.)
  - Breakdown by specific building types
- **Data Export**: Export complete analysis results to CSV format

## 🚀 Live Demo

https://github.com/user-attachments/assets/6e390251-dad4-4ee9-abbd-20a8f0156b89

[View Live Application](https://pixelpawnshop.github.io/Brandenburg-Flood-Risk/)

## 🛠️ Technology Stack

- **Frontend**: React 18 with Vite
- **Mapping**: Leaflet with Leaflet.draw for polygon drawing
- **Data Sources**:
  - Brandenburg LfU WMS Service for flood hazard maps
  - Overpass API for OpenStreetMap building data
  - German Census 2022 data (Zensus 2022) for accurate population statistics
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

## 📝 Future Enhancements

Potential improvements for consideration:
- Integration of additional infrastructure layers (Deiche/levees, critical facilities)
- More precise population distribution using building-level occupancy estimates
- Historical flood event markers with observed water levels
- Damage cost estimation models based on building types and flood depths
- Support for custom flood scenarios and return periods
- Temporal analysis showing population change over census periodructure layers (Deiche/levees)
- Population density overlay for impact estimation
- Historical flood event markers
- Damage cost estimation models
- Support for custom flood scenarios

## 📄 License

MIT License - feel free to use this project for learning purposes.

---

**Note**: This application uses publicly available data sources. For official flood risk assessments and planning decisions, please consult the Brandenburg Landesamt für Umwelt directly.

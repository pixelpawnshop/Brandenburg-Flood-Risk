# 🌊 Brandenburg Flood Risk Assessment

A web application for analyzing building exposure to flood risk scenarios in Brandenburg, Germany. This tool integrates official flood hazard maps from the Brandenburg State Environment Agency (LfU) with OpenStreetMap building data to provide comprehensive flood risk assessments.

## 🎯 Features

- **Interactive Map**: Draw polygons to select analysis areas anywhere in Brandenburg
- **Official Flood Data**: Integrates WMS layers from Brandenburg LfU showing three flood scenarios:
  - HQ-extrem (extreme flood scenario)
  - HQ-hoch (high flood scenario)
  - HQ-mittel (medium flood scenario)
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

## 🧠 Methodology – How the Analysis Works

1. User draws a polygon defining the area of interest.
2. All buildings within the polygon are retrieved via the OpenStreetMap Overpass API.
3. Building centroids are calculated for spatial queries.
4. For each building, flood exposure is determined by querying official LfU WMS layers (HQ-extrem, HQ-hoch, HQ-mittel).
5. Results are aggregated by building type, land use (BTLN), and census population data.
6. Summary statistics and affected features are visualized and exported as CSV.

## 🛠️ Technology Stack

- **Frontend**: React 18 with Vite
- **Mapping**: Leaflet with Leaflet.draw for polygon drawing
- **Data Sources**:
  - Brandenburg LfU WMS Service for flood hazard maps
  - Overpass API for OpenStreetMap building data
  - German Census 2022 data (Zensus 2022) for accurate population statistics
- **Deployment**: GitHub Pages with automated GitHub Actions workflow

- ## 📊 Data Sources & Attribution

- Flood hazard maps: Brandenburg Landesamt für Umwelt (LfU), provided via WMS services
- Building data: © OpenStreetMap contributors (ODbL)
- Land cover data: Brandenburg BTLN
- Population data: German Census 2022 (Zensus 2022)

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

- Integration of flood protection infrastructure (e.g. dikes and levees)
- More precise population distribution using building-level occupancy estimates
- Inclusion of historical flood events and observed water levels
- Damage cost estimation models based on building types and flood depth
- Support for additional or custom flood scenarios

## 📄 License

MIT License - feel free to use this project for learning purposes.

---

**Note**: This application uses publicly available data sources. For official flood risk assessments and planning decisions, please consult the Brandenburg Landesamt für Umwelt directly.

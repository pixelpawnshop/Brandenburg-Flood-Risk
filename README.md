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

[View Live Application](https://yourusername.github.io/port/) *(Update with your actual GitHub Pages URL)*

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
git clone https://github.com/yourusername/port.git
cd port
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

- **Flood Hazard Maps**: [Brandenburg Landesamt für Umwelt (LfU)](https://maps.brandenburg.de)
- **Building Data**: [OpenStreetMap](https://www.openstreetmap.org) contributors
- **Base Map**: OpenStreetMap

## 🎓 Use Case

This application was developed as a portfolio project to demonstrate skills relevant to flood risk management positions, specifically:
- GIS data integration and visualization
- Hydraulic modeling result display (WMS layers)
- Spatial data analysis
- Risk assessment and reporting
- Modern web development practices

Perfect for demonstrating technical capabilities for positions in:
- Hochwasserrisikomanagement (Flood Risk Management)
- Environmental planning and analysis
- GIS and spatial data science

## 🔍 Technical Highlights

- **Efficient Data Processing**: Batched WMS queries with rate limiting to respect server resources
- **Robust Error Handling**: Fallback mechanisms for different WMS response formats
- **Responsive Design**: Works on desktop and tablet devices
- **Progress Tracking**: Real-time progress updates during analysis
- **Performance Optimization**: Handles analysis of 1000+ buildings with user confirmation for large areas

## 📝 Future Enhancements

Potential improvements for consideration:
- Integration of additional infrastructure layers (Deiche/levees)
- Population density overlay for impact estimation
- Historical flood event markers
- Damage cost estimation models
- Support for custom flood scenarios
- Multi-language support (German/English toggle)

## 🤝 Contributing

This is a portfolio project, but suggestions and feedback are welcome! Feel free to open issues or submit pull requests.

## 📄 License

MIT License - feel free to use this project for your own portfolio or learning purposes.

## 👤 Author

Developed as a demonstration of GIS and flood risk management capabilities for job applications in the environmental sector.

---

**Note**: This application uses publicly available data sources. For official flood risk assessments and planning decisions, please consult the Brandenburg Landesamt für Umwelt directly.

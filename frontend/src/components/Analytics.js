// frontend/src/components/Analytics.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Paper
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat'; // This is the important import

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// A component to handle adding the heatmap layer to the map
const HeatmapController = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // Create the heatmap layer
    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    }).addTo(map);

    // Cleanup function to remove the layer when the component unmounts or points change
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
};

const Analytics = ({ incidents }) => {
  const [view, setView] = useState('charts');

  // --- Data Processing for Charts ---
  const incidentsByType = incidents.reduce((acc, incident) => {
    acc[incident.type] = (acc[incident.type] || 0) + 1;
    return acc;
  }, {});

  const incidentsByStatus = incidents.reduce((acc, incident) => {
    acc[incident.status] = (acc[incident.status] || 0) + 1;
    return acc;
  }, {});

  // --- Data Processing for Heatmap ---
  const heatmapData = incidents
    .filter(inc => inc.latitude && inc.longitude)
    .map(inc => [parseFloat(inc.latitude), parseFloat(inc.longitude), 1.0]); // Format: [lat, lng, intensity]

  // --- Chart Configurations ---
  const typeChartData = {
    labels: Object.keys(incidentsByType),
    datasets: [
      {
        label: 'Incidents by Type',
        data: Object.values(incidentsByType),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const statusChartData = {
    labels: Object.keys(incidentsByStatus),
    datasets: [
      {
        label: 'Incidents by Status',
        data: Object.values(incidentsByStatus),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  const handleViewChange = (event, nextView) => {
    if (nextView !== null) {
      setView(nextView);
    }
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Analytics & Hotspots
      </Typography>
      
      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={handleViewChange}
        aria-label="analytics view"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="charts" aria-label="charts">
          Charts
        </ToggleButton>
        <ToggleButton value="heatmap" aria-label="heatmap">
          Heatmap
        </ToggleButton>
      </ToggleButtonGroup>

      {view === 'charts' && incidents.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Incidents by Type</Typography>
            <Bar data={typeChartData} options={chartOptions} height={150} />
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Incidents by Status</Typography>
            <Pie data={statusChartData} options={chartOptions} height={150} />
          </Paper>
        </Box>
      )}

      {view === 'heatmap' && (
        <Paper sx={{ p: 2, height: 400 }}>
          <Typography variant="subtitle2" gutterBottom>Geographic Hotspots</Typography>
          <MapContainer
            center={[40.7128, -74.0060]} // Default center
            zoom={12}
            style={{ height: '350px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* This component will add the heatmap layer to the map */}
            <HeatmapController points={heatmapData} />
          </MapContainer>
        </Paper>
      )}
    </Box>
  );
};

export default Analytics;
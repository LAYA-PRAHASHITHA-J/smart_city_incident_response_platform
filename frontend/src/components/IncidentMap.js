// frontend/src/components/IncidentMap.js
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button
} from '@mui/material';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for different incident types
const getIcon = (type) => {
  const color = 
    type === 'Fire' ? 'red' :
    type === 'Accident' ? 'orange' :
    type === 'Crime' ? 'purple' :
    type === 'Medical' ? 'green' : 'blue';
  
  return new Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const MapController = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

const IncidentMap = ({ incidents }) => {
  const navigate = useNavigate();
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC
  const [mapZoom, setMapZoom] = useState(12);

  // Update map center when incidents change
  React.useEffect(() => {
    if (incidents.length > 0) {
      // Calculate center based on incidents
      const avgLat = incidents.reduce((sum, inc) => sum + parseFloat(inc.latitude), 0) / incidents.length;
      const avgLng = incidents.reduce((sum, inc) => sum + parseFloat(inc.longitude), 0) / incidents.length;
      setMapCenter([avgLat, avgLng]);
    }
  }, [incidents]);

  const handleViewDetails = (id) => {
    navigate(`/incident/${id}`);
  };

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapController center={mapCenter} zoom={mapZoom} />
        
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[parseFloat(incident.latitude), parseFloat(incident.longitude)]}
            icon={getIcon(incident.type)}
          >
            <Popup>
              <Box sx={{ maxWidth: 250 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {incident.title}
                </Typography>
                <Chip 
                  label={incident.type} 
                  size="small" 
                  color="primary" 
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" gutterBottom>
                  Status: {incident.status}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Priority: {incident.priority}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {incident.address}
                </Typography>
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={() => handleViewDetails(incident.id)}
                >
                  View Details
                </Button>
              </Box>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
};

export default IncidentMap;
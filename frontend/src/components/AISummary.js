// frontend/src/components/AISummary.js
import React from 'react';
import {
  Box,
  Typography,
  LinearProgress
} from '@mui/material';

const AISummary = ({ incidents }) => {
  // Count incidents by type
  const incidentsByType = incidents.reduce((acc, incident) => {
    acc[incident.type] = (acc[incident.type] || 0) + 1;
    return acc;
  }, {});

  // Count incidents by AI model
  const incidentsByModel = incidents.reduce((acc, incident) => {
    if (incident.aiModel) {
      acc[incident.aiModel] = (acc[incident.aiModel] || 0) + 1;
    }
    return acc;
  }, {});

  // Calculate average confidence
  const avgConfidence = incidents
    .filter(inc => inc.aiConfidence)
    .reduce((sum, inc, _, arr) => sum + inc.aiConfidence / arr.length, 0);

  const totalIncidents = incidents.length;
  const aiDetectedIncidents = incidents.filter(inc => inc.aiModel).length;
  const aiDetectionRate = totalIncidents > 0 ? (aiDetectedIncidents / totalIncidents) * 100 : 0;

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        AI Detection Rate: {aiDetectionRate.toFixed(1)}%
      </Typography>
      
      {aiDetectedIncidents > 0 && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Average Confidence: {(avgConfidence * 100).toFixed(1)}%
        </Typography>
      )}
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Incidents by Type
        </Typography>
        {Object.entries(incidentsByType).map(([type, count]) => (
          <Box key={type} sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">{type}</Typography>
              <Typography variant="body2">{count}</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(count / totalIncidents) * 100} 
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        ))}
      </Box>
      
      {Object.keys(incidentsByModel).length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            AI Models Used
          </Typography>
          {Object.entries(incidentsByModel).map(([model, count]) => (
            <Box key={model} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{model}</Typography>
                <Typography variant="body2">{count}</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(count / aiDetectedIncidents) * 100} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AISummary;
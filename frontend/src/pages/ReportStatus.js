// frontend/src/pages/ReportStatus.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Container,
  Chip,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import publicIncidentService from '../services/publicIncidentService'; // A new service for public calls

const ReportStatus = () => {
  const [reportId, setReportId] = useState('');
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!reportId.trim()) {
      setError('Please enter a Report ID.');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);
    
    try {
      // This would be a new public endpoint, e.g., GET /api/public/incidents/:reportId
      const data = await publicIncidentService.getIncidentByPublicId(reportId);
      setIncident(data);
    } catch (err) {
      console.error('Error fetching public incident:', err);
      if (err.response?.status === 404) {
        setError('Report ID not found. Please check the ID and try again.');
      } else {
        setError('Failed to fetch report status. Please try again later.');
      }
      setIncident(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    // ... same function as before
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Track Your Report
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Enter the Report ID you received via email or SMS to check the status of your submission.
        </Typography>
        
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="Report ID (e.g., RP-78910-XYZ)"
            variant="outlined"
            value={reportId}
            onChange={(e) => setReportId(e.target.value.toUpperCase())}
          />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Track'}
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {searched && !loading && !error && incident && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h5" gutterBottom>{incident.title}</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography><strong>Status:</strong> <Chip label={incident.status} color={getStatusColor(incident.status)} /></Typography>
              <Typography><strong>Reported At:</strong> {format(new Date(incident.createdAt), 'MMM dd, yyyy HH:mm')}</Typography>
              {incident.resolvedAt && (
                <Typography><strong>Resolved At:</strong> {format(new Date(incident.resolvedAt), 'MMM dd, yyyy HH:mm')}</Typography>
              )}
              <Typography><strong>Description:</strong> {incident.description}</Typography>
              <Typography><strong>Location:</strong> {incident.address}</Typography>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default ReportStatus;
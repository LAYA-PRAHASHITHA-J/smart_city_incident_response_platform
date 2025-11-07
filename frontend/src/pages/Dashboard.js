// frontend/src/pages/Dashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. ENSURE THIS IMPORT IS PRESENT
import {
  Grid,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import IncidentMap from '../components/IncidentMap';
import IncidentFeed from '../components/IncidentFeed';
import AISummary from '../components/AISummary';
import Analytics from '../components/Analytics';
import incidentService from '../services/incidentService';

const Dashboard = () => {
  // --- 2. ALL HOOKS MUST BE DECLARED AT THE TOP ---
  // This ensures they are always called in the same order.
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { socket } = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState({
    type: '',
    status: ''
  });

  // --- 3. useEffect HOOKS COME NEXT ---
  // Fetch incidents on component mount and when filters change
  useEffect(() => {
    // This flag will be used to prevent state updates if the component unmounts
    let isMounted = true; 

    // Don't fetch if the user isn't logged in yet
    if (!user) return;

    const fetchIncidents = async () => {
      try {
        const data = await incidentService.getIncidents(filter);
        // Only update state if the component is still mounted
        if (isMounted) {
          setIncidents(data.incidents);
        }
      } catch (error) {
        console.error('Error fetching incidents:', error);
      }
    };

    fetchIncidents();

    // The cleanup function for this effect.
    // This runs when the component unmounts.
    return () => {
      isMounted = false; // Set the flag to false when unmounting
    };
  }, [filter, user]); // Added 'user' as a dependency

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !user) return;

    socket.on('newIncident', (incident) => {
      setIncidents(prev => [incident, ...prev]);
    });

    socket.on('incidentUpdated', (updatedIncident) => {
      setIncidents(prev =>
        prev.map(incident =>
          incident.id === updatedIncident.id ? updatedIncident : incident
        )
      );
    });

    socket.on('departmentIncident', (incident) => {
      if (user.role !== 'Admin' && incident.type === user.role) {
        setIncidents(prev => [incident, ...prev]);
      }
    });

    return () => {
      socket.off('newIncident');
      socket.off('incidentUpdated');
      socket.off('departmentIncident');
    };
  }, [socket, user]);

  // --- 4. CONDITIONAL LOGIC (EARLY RETURNS) COMES LAST ---
  // Show a loading spinner while the auth check is in progress
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // If loading is finished but there is no user, redirect to login
  if (!user) {
    navigate('/login');
    return null; // Render nothing while redirecting
  }

  // --- 5. MAIN JSX RENDER ---
  // Now we are certain that `user` exists, so the rest of the component is safe to run
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Typography variant="h4" gutterBottom>
        {user.role === 'Admin' ? 'Overview Dashboard' : `${user.role} Department Dashboard`}
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="type-filter-label">Type</InputLabel>
          <Select
            labelId="type-filter-label"
            id="type-filter"
            name="type"
            value={filter.type}
            onChange={handleFilterChange}
            label="Type"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Fire">Fire</MenuItem>
            <MenuItem value="Accident">Accident</MenuItem>
            <MenuItem value="Crime">Crime</MenuItem>
            <MenuItem value="Medical">Medical</MenuItem>
          </Select>
        </FormControl>

        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            name="status"
            value={filter.status}
            onChange={handleFilterChange}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="New">New</MenuItem>
            <MenuItem value="Acknowledged">Acknowledged</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Resolved">Resolved</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2, height: 500 }}>
            <Typography variant="h6" gutterBottom>
              Incident Map
            </Typography>
            <IncidentMap incidents={incidents} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, height: 500, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Recent Incidents
            </Typography>
            <IncidentFeed incidents={incidents} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              AI Detection Summary
            </Typography>
            <AISummary incidents={incidents} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Analytics
            </Typography>
            <Analytics incidents={incidents} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
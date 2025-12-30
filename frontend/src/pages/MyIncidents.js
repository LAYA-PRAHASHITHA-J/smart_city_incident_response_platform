import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const MyIncidents = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchMyIncidents();
  }, []);

  const fetchMyIncidents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('[MyIncidents] Fetching incidents from:', `${API_URL}/api/incidents/my-incidents`);
      console.log('[MyIncidents] Token exists:', !!token);
      console.log('[MyIncidents] User:', user);
      
      const response = await axios.get(
        `${API_URL}/api/incidents/my-incidents`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[MyIncidents] Response data:', response.data);
      console.log('[MyIncidents] Incidents count:', response.data.incidents?.length || 0);
      
      setIncidents(response.data.incidents || []);
      setError('');
    } catch (err) {
      console.error('[MyIncidents] Error fetching incidents:', err);
      console.error('[MyIncidents] Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to load incidents');
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (incident) => {
    setSelectedIncident(incident);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedIncident(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New':
        return 'warning';
      case 'Acknowledged':
        return 'info';
      case 'Resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Reported Incidents
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {incidents.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">
            You haven't reported any incidents yet.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>ID</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Location</strong></TableCell>
                <TableCell><strong>Reported</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Priority</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow key={incident.id} hover>
                  <TableCell>#{incident.id}</TableCell>
                  <TableCell>{incident.type}</TableCell>
                  <TableCell>{incident.location}</TableCell>
                  <TableCell>
                    {new Date(incident.createdAt).toLocaleDateString()} 
                    {' '}
                    {new Date(incident.createdAt).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={incident.status}
                      color={getStatusColor(incident.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={incident.priority}
                      color={getPriorityColor(incident.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleViewDetails(incident)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Incident #{selectedIncident?.id} - {selectedIncident?.type}
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Location
                </Typography>
                <Typography>{selectedIncident.location}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={selectedIncident.status}
                  color={getStatusColor(selectedIncident.status)}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Priority
                </Typography>
                <Chip
                  label={selectedIncident.priority}
                  color={getPriorityColor(selectedIncident.priority)}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Reported On
                </Typography>
                <Typography>
                  {new Date(selectedIncident.createdAt).toLocaleString()}
                </Typography>
              </Box>

              {selectedIncident.description && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Description
                  </Typography>
                  <Typography>{selectedIncident.description}</Typography>
                </Box>
              )}

              {selectedIncident.aiModel && (
                <>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      AI Analysis
                    </Typography>
                    <Typography>Model: {selectedIncident.aiModel}</Typography>
                    {selectedIncident.confidence && (
                      <Typography>
                        Confidence: {(selectedIncident.confidence * 100).toFixed(2)}%
                      </Typography>
                    )}
                  </Box>
                </>
              )}

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Last Updated
                </Typography>
                <Typography>
                  {new Date(selectedIncident.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MyIncidents;

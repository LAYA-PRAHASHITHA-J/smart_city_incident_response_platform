// frontend/src/pages/IncidentDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Modal,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Container
} from '@mui/material';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import incidentService from '../services/incidentService';

const IncidentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [assignableUsers, setAssignableUsers] = useState([]);

  const getFullMediaUrl = (mediaUrl) => {
    if (!mediaUrl) return null;
    const backendUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
    return `${backendUrl}${mediaUrl}`;
  };

  useEffect(() => {
    if (!user) return;

    const fetchIncident = async () => {
      if (!id) return;

      try {
        // --- REMOVED setLoading(true) ---
        const data = await incidentService.getIncidentById(id);
        setIncident(data);
      } catch (err) {
        console.error('Error fetching incident details:', err);
        if (err.response?.status === 403) {
          setError('You are not authorized to view this incident.');
        } else if (err.response?.status === 404) {
          setError('Incident not found.');
        } else {
          setError('Failed to load incident details.');
        }
      } finally {
        // --- REMOVED setLoading(false) ---
      }
    };

    fetchIncident();
  }, [id, user]);

  useEffect(() => {
    if (!incident || !user) return;

    const fetchUsers = async () => {
      try {
        const users = await incidentService.getAssignableUsers(incident.type);
        setAssignableUsers(users);
      } catch (error) {
        console.error("Failed to fetch assignable users:", error);
      }
    };
    
    fetchUsers();
  }, [incident, user]);

  const handleStatusUpdate = async () => {
    try {
      await incidentService.updateIncidentStatus(id, newStatus);
      setIncident(prev => ({ ...prev, status: newStatus }));
      setStatusDialogOpen(false);
    } catch (error) {
      console.error('Error updating incident status:', error);
    }
  };

  const handleAssignIncident = async () => {
    try {
      await incidentService.assignIncident(id, assignedTo);
      setIncident(prev => ({ ...prev, assignedTo }));
      setAssignDialogOpen(false);
    } catch (error) {
      console.error('Error assigning incident:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        <Button onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!incident) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>Incident not found.</Typography>
        <Button onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const getStatusColor = (status) => {
    return status === 'New' ? 'error' :
           status === 'Acknowledged' ? 'warning' :
           status === 'In Progress' ? 'info' :
           status === 'Resolved' ? 'success' : 'default';
  };

  const getPriorityColor = (priority) => {
    return priority === 'Critical' ? 'error' :
           priority === 'High' ? 'warning' :
           priority === 'Medium' ? 'info' :
           priority === 'Low' ? 'success' : 'default';
  };

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            {incident.title}
          </Typography>
          <Box>
            <Button variant="outlined" sx={{ mr: 1 }} onClick={() => setStatusDialogOpen(true)}>
              Update Status
            </Button>
            {(user.role === 'Admin' || user.role === incident.type) && (
              <Button variant="outlined" sx={{ mr: 1 }} onClick={() => setAssignDialogOpen(true)}>
                Assign
              </Button>
            )}
            <Button variant="outlined" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Incident Details
              </Typography>
              <Typography variant="body1" paragraph>
                {incident.description}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Location
              </Typography>
              <Typography variant="body1">
                {incident.address}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lat: {incident.latitude}, Lng: {incident.longitude}
              </Typography>
            </Box>

            {incident.mediaUrl && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Media
                </Typography>
                <img 
                  src={getFullMediaUrl(incident.mediaUrl)} 
                  alt="Incident media" 
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                />
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Type" 
                    secondary={<Chip label={incident.type} size="small" color="primary" />} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Status" 
                    secondary={<Chip label={incident.status} size="small" color={getStatusColor(incident.status)} />} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Priority" 
                    secondary={<Chip label={incident.priority} size="small" color={getPriorityColor(incident.priority)} />} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Source" 
                    secondary={incident.source} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Reported By" 
                    secondary={incident.reportedBy} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Reported At" 
                    secondary={format(new Date(incident.createdAt), 'MMM dd, yyyy HH:mm')} 
                  />
                </ListItem>
                {incident.resolvedAt && (
                  <ListItem>
                    <ListItemText 
                      primary="Resolved At" 
                      secondary={format(new Date(incident.resolvedAt), 'MMM dd, yyyy HH:mm')} 
                    />
                  </ListItem>
                )}
                {incident.aiModel && (
                  <ListItem>
                    <ListItemText 
                      primary="AI Detection" 
                      secondary={`${incident.aiModel} (${(incident.aiConfidence * 100).toFixed(1)}% confidence)`} 
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Status Update Dialog */}
      <Modal
      open={statusDialogOpen}
      onClose={() => setStatusDialogOpen(false)}
      aria-labelledby="status-update-dialog-title"
      aria-describedby="status-update-dialog-description"
    >
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle id="status-update-dialog-title">Update Incident Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="status-select-label">Status</InputLabel>
            <Select
              labelId="status-select-label"
              id="status-select"
              value={newStatus}
              label="Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <MenuItem value="New">New</MenuItem>
              <MenuItem value="Acknowledged">Acknowledged</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Resolved">Resolved</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusUpdate}>Update</Button>
        </DialogActions>
      </Dialog>
    </Modal>
      {/* Assign Incident Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
        <DialogTitle>Assign Incident</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="assign-select-label">Assign To</InputLabel>
            <Select
              labelId="assign-select-label"
              id="assign-select"
              value={assignedTo}
              label="Assign To"
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              {assignableUsers.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.username} ({user.role})
              </MenuItem>
            ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignIncident}>Assign</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncidentDetails;
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import { PhotoCamera, LocationOn } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import incidentService from '../services/incidentService';

const CitizenReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // To get the user's name
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Fire', // Default type
    latitude: '',
    longitude: '',
    address: ''
  });
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
        },
        (error) => {
          setError('Unable to retrieve your location. Please enter it manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const incidentData = {
        ...formData,
        source: 'Citizen App',
        priority: 'Medium' // Default priority for citizen reports
      };

      const response = await incidentService.createIncident(incidentData, mediaFile);
      setSuccess('Incident reported successfully! It has been sent to the relevant department.');
      // Clear form
      setFormData({ title: '', description: '', type: 'Fire', latitude: '', longitude: '', address: '' });
      setMediaFile(null);
      setMediaPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Redirect after a short delay
      setTimeout(() => navigate('/dashboard'), 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to report incident.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Report an Incident
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Please provide as much detail as possible. Your report will be analyzed and forwarded to the appropriate emergency services.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Incident Title"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Incident Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              label="Incident Type"
              onChange={handleChange}
            >
              <MenuItem value="Fire">Fire</MenuItem>
              <MenuItem value="Accident">Accident</MenuItem>
              <MenuItem value="Crime">Crime</MenuItem>
              <MenuItem value="Medical">Medical</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Description"
            name="description"
            multiline
            rows={4}
            required
            value={formData.description}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="h6" gutterBottom>Location</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Latitude"
              name="latitude"
              type="number"
              value={formData.latitude}
              onChange={handleChange}
            />
            <TextField
              label="Longitude"
              name="longitude"
              type="number"
              value={formData.longitude}
              onChange={handleChange}
            />
            <IconButton onClick={handleLocationClick} color="primary" aria-label="get-location">
              <LocationOn />
            </IconButton>
          </Box>
          <TextField
            fullWidth
            label="Address or Landmark"
            name="address"
            value={formData.address}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />

          <Typography variant="h6" gutterBottom>Media (Optional)</Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<PhotoCamera />}
            sx={{ mb: 2 }}
          >
            Upload Photo/Video
            <input
              type="file"
              hidden
              accept="image/*,video/*"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
          </Button>
          {mediaPreview && (
            <Box sx={{ mb: 2, maxWidth: '100%' }}>
              {mediaFile.type.startsWith('image/') ? (
                <img src={mediaPreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
              ) : (
                <video src={mediaPreview} controls style={{ width: '100%', maxHeight: '200px' }} />
              )}
            </Box>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress /> : 'Submit Report'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CitizenReport;
// frontend/src/services/incidentService.js
import axios from 'axios';

// Create a dedicated axios instance for the backend
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL || 'http://localhost:5000',
});

const incidentService = {
  getIncidents: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await axios.get(`/api/incidents?${params.toString()}`);
    return response.data;
  },
  
  getIncidentById: async (id) => {
    const response = await axios.get(`/api/incidents/${id}`);
    return response.data;
  },
  
  createIncident: async (incidentData, mediaFile) => {
    const formData = new FormData();
    
    // Add all incident data to form data
    Object.keys(incidentData).forEach(key => {
      formData.append(key, incidentData[key]);
    });
    
    // Add media file if provided
    if (mediaFile) {
      formData.append('media', mediaFile);
    }
    
    const response = await axios.post('/api/incidents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  updateIncidentStatus: async (id, status) => {
    const response = await axios.patch(`/api/incidents/${id}/status`, { status });
    return response.data;
  },
  
  assignIncident: async (id, assignedTo) => {
    const response = await axios.patch(`/api/incidents/${id}/assign`, { assignedTo });
    return response.data;
  },

  // --- MOVE THE ALERT FUNCTIONS INSIDE THE OBJECT ---
  getAlerts: async () => {
    const response = await axios.get('/api/alerts');
    return response.data;
  },

  markAlertAsRead: async (id) => {
    const response = await axios.patch(`/api/alerts/${id}/read`);
    return response.data;
  },

  getAssignableUsers: async (incidentType) => {
    const params = incidentType ? `?incidentType=${incidentType}` : '';
    const response = await axios.get(`/api/users/assignable${params}`);
    return response.data;
  }
};

// --- EXPORT THE INCIDENTSERVICE OBJECT BY DEFAULT ---
export default incidentService;
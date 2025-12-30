// frontend/src/pages/Dashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Tab,
  Tabs,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Button,
  Snackbar
} from '@mui/material';
import {
  Info as InfoIcon,
  Help as HelpIcon,
  Timeline as TimelineIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon,
  Report as ReportIcon,
  Public as PublicIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import IncidentMap from '../components/IncidentMap';
import IncidentFeed from '../components/IncidentFeed';
import AISummary from '../components/AISummary';
import Analytics from '../components/Analytics';
import incidentService from '../services/incidentService';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { socket } = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [myReportsData, setMyReportsData] = useState([]); // Separate state for citizen's own reports
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    department: '',
    collaborationType: 'all',
    viewMode: 'all'
  });
  const [tabValue, setTabValue] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [refreshOpen, setRefreshOpen] = useState(false);

  // Update viewMode after user is loaded
  useEffect(() => {
    if (user) {
      setFilter(prev => ({
        ...prev,
        viewMode: user.role === 'Citizen' ? 'myreports' : 'all'
      }));
    }
  }, [user]);

  // Force refresh when user changes from non-citizen to citizen
  useEffect(() => {
    if (user && user.role === 'Citizen') {
      setFilter(prev => ({
        ...prev,
        viewMode: 'myreports'
      }));
      // Refresh happens automatically via the filter useEffect
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    if (!user) return;

    const fetchIncidents = async () => {
      try {
        const data = await incidentService.getIncidents(filter);
        
        if (isMounted) {
          setIncidents(data.incidents || data);
        }
      } catch (error) {
        console.error('Error fetching incidents:', error);
      }
    };

    fetchIncidents();

    return () => {
      isMounted = false;
    };
  }, [filter, user, userLocation]);

  // Separate effect to fetch citizen's reports for stats (independent of filters)
  useEffect(() => {
    let isMounted = true;

    const fetchMyReports = async () => {
      if (user && user.role === 'Citizen') {
        try {
          console.log('Fetching citizen reports with filter:', { viewMode: 'myreports' });
          const myReportsFilter = { viewMode: 'myreports' };
          const data = await incidentService.getIncidents(myReportsFilter);
          console.log('Received data from backend:', data);
          if (isMounted) {
            setMyReportsData(data.incidents || data);
            console.log('Set myReportsData to:', data.incidents?.length || 0, 'reports');
          }
        } catch (error) {
          console.error('Error fetching my reports for stats:', error);
          console.error('Error details:', error.response?.data || error.message);
        }
      }
    };

    fetchMyReports();

    return () => {
      isMounted = false;
    };
  }, [user]); // Only depends on user, not on filter changes

  // Refetch citizen reports when window/tab regains focus (e.g., after navigating back)
  useEffect(() => {
    const handleFocus = async () => {
      if (user && user.role === 'Citizen') {
        try {
          const myReportsFilter = { viewMode: 'myreports' };
          const data = await incidentService.getIncidents(myReportsFilter);
          setMyReportsData(data.incidents || data);
          console.log('Refetched citizen reports on focus:', data.incidents?.length || 0);
        } catch (error) {
          console.error('Error refetching reports on focus:', error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  // Refetch when navigating back to dashboard
  useEffect(() => {
    const fetchMyReportsOnNav = async () => {
      if (user && user.role === 'Citizen') {
        try {
          const myReportsFilter = { viewMode: 'myreports' };
          const data = await incidentService.getIncidents(myReportsFilter);
          setMyReportsData(data.incidents || data);
          console.log('Refetched citizen reports on navigation:', data.incidents?.length || 0);
        } catch (error) {
          console.error('Error refetching reports on navigation:', error);
        }
      }
    };

    fetchMyReportsOnNav();
  }, [location.pathname, user]); // Trigger whenever pathname changes

  // Get user's location for nearby incidents feature
  useEffect(() => {
    if (user && user.role === 'Citizen' && !userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.error('Error getting location:', error);
          }
        );
      }
    }
  }, [user, userLocation]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('newIncident', (incident) => {
      setIncidents(prev => [incident, ...prev]);
      
      // If this is a citizen and it's their incident, add to myReportsData too
      if (user.role === 'Citizen' && 
          (incident.reportedBy === user.username || incident.detectedBy === user.id)) {
        setMyReportsData(prev => [incident, ...prev]);
      }
    });

    socket.on('incidentUpdated', (updatedIncident) => {
      setIncidents(prev =>
        prev.map(incident =>
          incident.id === updatedIncident.id ? updatedIncident : incident
        )
      );
      
      // Update in myReportsData as well if it's a citizen's report
      if (user.role === 'Citizen') {
        setMyReportsData(prev =>
          prev.map(incident =>
            incident.id === updatedIncident.id ? updatedIncident : incident
          )
        );
      }
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

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    setRefreshMessage('Dashboard refreshed');
    setRefreshOpen(true);
  
    // Force a re-fetch of incidents
    const fetchIncidents = async () => {
      try {
        const data = await incidentService.getIncidents(filter);
        setIncidents(data.incidents || data);
      } catch (error) {
        console.error('Error refreshing incidents:', error);
      }
    };

    // Also refresh citizen's own reports for stats (without filters)
    const fetchMyReports = async () => {
      if (user.role === 'Citizen') {
        try {
          // Fetch ALL of the citizen's reports without any type/status filters
          const myReportsFilter = { viewMode: 'myreports' };
          const data = await incidentService.getIncidents(myReportsFilter);
          setMyReportsData(data.incidents || data);
          console.log('Refreshed citizen reports for stats:', data.incidents?.length || 0);
        } catch (error) {
          console.error('Error refreshing my reports:', error);
        }
      }
    };
  
    fetchIncidents();
    fetchMyReports();
  };

  // Define multi-department incident types
  const multiDepartmentIncidents = {
    'Fire': ['Fire', 'Medical', 'Police'],
    'Accident': ['Traffic', 'Medical', 'Police'],
    'Crime': ['Police', 'Medical'],
    'Medical': ['Medical', 'Police', 'Traffic'],
    'Natural Disaster': ['Fire', 'Medical', 'Police', 'Traffic'],
    'Public Event': ['Police', 'Traffic', 'Medical'],
    'Infrastructure Failure': ['Traffic', 'Fire', 'Medical']
  };

  const getDepartmentsForIncident = (incident) => {
    return multiDepartmentIncidents[incident.type] || [incident.type];
  };

  const isIncidentRelevantToUser = (incident) => {
    if (user.role === 'Admin') return true;
    const involvedDepts = getDepartmentsForIncident(incident);
    return involvedDepts.includes(user.role);
  };

  // Filter incidents based on user role
  let filteredIncidents = incidents;
  
  if (user.role === 'Citizen') {
    // For citizens, the backend already filters based on viewMode
    // We only need to apply client-side nearby filtering when user has location
    if (filter.viewMode === 'nearby' && userLocation) {
      // For nearby view, filter by distance (backend sends all public incidents)
      filteredIncidents = incidents.filter(incident => {
        // Always include user's own reports
        if (incident.reportedBy === user.username || incident.detectedBy === user.id) return true;
        
        // Check if incident is nearby
        if (!incident.latitude || !incident.longitude) return false;
        
        // Calculate distance using Haversine formula (simplified)
        const R = 6371; // Earth's radius in km
        const dLat = (incident.latitude - userLocation.latitude) * Math.PI / 180;
        const dLon = (incident.longitude - userLocation.longitude) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(incident.latitude * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance <= 5; // Within 5km
      });
    }
    // For 'myreports' and 'all' views, use incidents as-is from backend
  } else {
    // For department users and admins, show incidents relevant to their role
    filteredIncidents = incidents.filter(incident => isIncidentRelevantToUser(incident));
  }

  // Apply additional filters
  if (filter.type) {
    filteredIncidents = filteredIncidents.filter(incident => incident.type === filter.type);
  }
  
  if (filter.status) {
    filteredIncidents = filteredIncidents.filter(incident => incident.status === filter.status);
  }

  if (filter.collaborationType === 'multi') {
    filteredIncidents = filteredIncidents.filter(
      incident => getDepartmentsForIncident(incident).length > 1
    );
  } else if (filter.collaborationType === 'single') {
    filteredIncidents = filteredIncidents.filter(
      incident => getDepartmentsForIncident(incident).length === 1
    );
  }

  // Calculate key metrics
  const totalIncidents = filteredIncidents.length;
  const activeIncidents = filteredIncidents.filter(i => 
    ['New', 'Acknowledged', 'In Progress'].includes(i.status)
  ).length;
  const resolvedIncidents = filteredIncidents.filter(i => i.status === 'Resolved').length;
  const multiDeptIncidents = filteredIncidents.filter(i => 
    getDepartmentsForIncident(i).length > 1
  ).length;
  
  // For citizens, calculate personal stats from myReportsData
  const myReports = user.role === 'Citizen' ? myReportsData.length : 0;
  const myResolvedReports = user.role === 'Citizen' ? 
    myReportsData.filter(incident => incident.status === 'Resolved').length : 0;
  const myPendingReports = user.role === 'Citizen' ? 
    myReportsData.filter(incident => 
      ['New', 'Acknowledged', 'In Progress'].includes(incident.status)
    ).length : 0;

  // My Reports Summary component for Citizens
  const MyReportsSummary = () => {
    if (user.role !== 'Citizen') return null;
    
    // Calculate resolution rate
    const resolutionRate = myReports > 0 
      ? Math.round((myResolvedReports / myReports) * 100) 
      : 0;
    
    return (
      <Alert 
        severity="info" 
        sx={{ mb: 3 }}
        icon={<InfoIcon />}
      >
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          📊 Your Report Summary
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Reports</Typography>
            <Typography variant="h6" fontWeight="bold">{myReports}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Pending</Typography>
            <Typography variant="h6" fontWeight="bold" color="warning.main">
              {myPendingReports}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Resolved</Typography>
            <Typography variant="h6" fontWeight="bold" color="success.main">
              {myResolvedReports}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Resolution Rate</Typography>
            <Typography variant="h6" fontWeight="bold" color="primary.main">
              {resolutionRate}%
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="body2" color="text.secondary">
          💡 <strong>Current View:</strong> {
            filter.viewMode === 'myreports' ? 'Showing only your reports' :
            filter.viewMode === 'nearby' ? 'Showing nearby incidents in your area' :
            'Showing all public incidents'
          }
        </Typography>
      </Alert>
    );
  };

  // Refresh Button component
  const RefreshButton = () => {
    if (user.role === 'Citizen') {
      return (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            color="primary"
          >
            Refresh Dashboard
          </Button>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {user.role === 'Admin' ? 'City Overview Dashboard' : 
           user.role === 'Citizen' ? 'Community Safety Dashboard' : 
           `${user.role} Department Dashboard`}
        </Typography>
        <Tooltip title="This dashboard shows real-time incident data and community safety information">
          <IconButton>
            <HelpIcon color="action" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* My Reports Summary for Citizens */}
      <MyReportsSummary />

      {/* Key Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {user.role === 'Citizen' ? (
          // Citizen-specific metrics
          <>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ReportIcon color="primary" sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="h4">{myReports}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        My Reports
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TimelineIcon color="warning" sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="h4">{myPendingReports}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Reports
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="h4">{myResolvedReports}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Resolved Reports
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PublicIcon color="info" sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="h4">{totalIncidents}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Area Incidents
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        ) : (
          // Admin and department metrics
          <>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="h4">{totalIncidents}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Incidents
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TimelineIcon color="warning" sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="h4">{activeIncidents}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Incidents
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="h4">{resolvedIncidents}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Resolved Incidents
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PeopleIcon color="info" sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="h4">{multiDeptIncidents}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Multi-Department
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Refresh button for citizens */}
      <RefreshButton />

      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filter Incidents
          <Tooltip title="Use these filters to view specific types of incidents">
            <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
          </Tooltip>
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="type-filter-label">Incident Type</InputLabel>
            <Select
              labelId="type-filter-label"
              id="type-filter"
              name="type"
              value={filter.type}
              onChange={handleFilterChange}
              label="Incident Type"
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="Fire">🔥 Fire</MenuItem>
              <MenuItem value="Accident">🚗 Accident</MenuItem>
              <MenuItem value="Crime">🚔 Crime</MenuItem>
              <MenuItem value="Medical">🚑 Medical</MenuItem>
              <MenuItem value="Natural Disaster">🌪️ Natural Disaster</MenuItem>
              <MenuItem value="Public Event">🎉 Public Event</MenuItem>
              <MenuItem value="Infrastructure Failure">🚧 Infrastructure</MenuItem>
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              name="status"
              value={filter.status}
              onChange={handleFilterChange}
              label="Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="New">🆕 New</MenuItem>
              <MenuItem value="Acknowledged">👀 Acknowledged</MenuItem>
              <MenuItem value="In Progress">⚙️ In Progress</MenuItem>
              <MenuItem value="Resolved">✅ Resolved</MenuItem>
            </Select>
          </FormControl>

          {user.role === 'Citizen' && (
            <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="view-filter-label">View Mode</InputLabel>
              <Select
                labelId="view-filter-label"
                id="view-filter"
                name="viewMode"
                value={filter.viewMode}
                onChange={handleFilterChange}
                label="View Mode"
              >
                <MenuItem value="myreports">📝 My Reports</MenuItem>
                <MenuItem value="nearby">📍 Nearby Incidents</MenuItem>
                <MenuItem value="all">🌍 All Public Incidents</MenuItem>
              </Select>
            </FormControl>
          )}

          {user.role !== 'Citizen' && (
            <FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="collaboration-filter-label">Department Involvement</InputLabel>
              <Select
                labelId="collaboration-filter-label"
                id="collaboration-filter"
                name="collaborationType"
                value={filter.collaborationType}
                onChange={handleFilterChange}
                label="Department Involvement"
              >
                <MenuItem value="all">📊 All Incidents</MenuItem>
                <MenuItem value="multi">🤝 Multi-Department</MenuItem>
                <MenuItem value="single">👤 Single Department</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      </Paper>

      {/* Action button for citizens to report new incidents */}
      {user.role === 'Citizen' && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<ReportIcon />}
            onClick={() => navigate('/report')}
          >
            Report New Incident
          </Button>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="📍 Incident Map" />
          <Tab label="📋 Incident List" />
          {user.role !== 'Citizen' && <Tab label="🤝 Department Collaboration" />}
          {user.role !== 'Citizen' && <Tab label="📈 Performance Analytics" />}
          {user.role === 'Citizen' && <Tab label="📊 Status Distribution" />}
          {user.role === 'Citizen' && <Tab label="📈 Type Distribution" />}
          {user.role === 'Citizen' && <Tab label="📅 Report Timeline" />}
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {user.role === 'Citizen' ? 'Community Incident Map' : 'Live Incident Map'}
                <Tooltip title="Map shows the location of all incidents. Click on markers for details.">
                  <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                </Tooltip>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user.role === 'Citizen' 
                  ? 'This map displays incidents in your area. Each marker represents an incident, and the color indicates its status.'
                  : 'This map displays all reported incidents in real-time. Each marker represents an incident, and the color indicates its status.'}
              </Typography>
              <IncidentMap incidents={filteredIncidents} userLocation={userLocation} />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 2, maxHeight: 600, overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                {user.role === 'Citizen' ? 'Recent Community Incidents' : 'Recent Incidents'}
                <Tooltip title={user.role === 'Citizen' ? 'Latest incidents reported in your area.' : 'Latest incidents reported in your department.'}>
                  <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                </Tooltip>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user.role === 'Citizen' 
                  ? 'Shows the most recent incidents in your area with their current status.'
                  : 'Shows the most recent incidents with their current status and responding departments.'}
              </Typography>
              <IncidentFeed incidents={filteredIncidents} isCitizen={user.role === 'Citizen'} user={user} />
            </Paper>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {user.role === 'Citizen' ? 'Community Incident Feed' : 'Incident Feed'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user.role === 'Citizen' 
                  ? 'Detailed view of all incidents in your area.'
                  : 'Detailed view of all incidents in your department.'}
              </Typography>
              <IncidentFeed incidents={filteredIncidents} isCitizen={user.role === 'Citizen'} user={user} detailedView={true} />
            </Paper>
          </Grid>
        </Grid>
      )}

      {user.role !== 'Citizen' && tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Department Collaboration:</strong> This view shows how different departments work together 
                to resolve incidents. Some incidents require multiple departments (e.g., accidents need Traffic, 
                Medical, and Police departments).
              </Typography>
            </Alert>
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Department Collaboration Network
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This visualization shows how often departments work together. Thicker lines indicate 
                more frequent collaboration.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="collaboration"
                multiDepartmentIncidents={multiDepartmentIncidents}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Multi-Department Incidents
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These incident types typically require multiple departments to work together.
              </Typography>
              <Box sx={{ mt: 2 }}>
                {Object.entries(multiDepartmentIncidents).map(([type, departments]) => {
                  const count = filteredIncidents.filter(i => i.type === type).length;
                  return (
                    <Box key={type} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">{type}</Typography>
                        <Chip label={`${count} incidents`} size="small" color="primary" />
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {departments.map(dept => (
                          <Chip key={dept} label={dept} size="small" variant="outlined" />
                        ))}
                      </Box>
                      <Divider sx={{ mt: 1 }} />
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {user.role !== 'Citizen' && tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Performance Analytics:</strong> These metrics help understand how quickly and 
                effectively incidents are being resolved. Compare performance across different incident types 
                and departments.
              </Typography>
            </Alert>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Average Response Time
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Shows how quickly departments respond to incidents (in minutes). Lower is better.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="response-time"
                userRole={user.role}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Resolution Success Rate
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Percentage of incidents successfully resolved by each department.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="resolution-rate"
                userRole={user.role}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Incident Trends Over Time
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Shows how different types of incidents vary over time. Helps identify patterns and plan resources.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="trends"
                multiDepartmentIncidents={multiDepartmentIncidents}
              />
            </Paper>
          </Grid>
        </Grid>
      )}

      {user.role === 'Citizen' && tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Status Distribution:</strong> This view shows the current status of your reported incidents.
                This helps you understand which of your reports are still pending, in progress, or have been resolved.
              </Typography>
            </Alert>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Status Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Shows the current status of all incidents you have reported.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="status-distribution"
                userRole={user.role}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Type Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Shows the types of incidents you have reported most frequently.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="type-distribution"
                userRole={user.role}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Report Timeline
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Shows your incident reporting activity over time.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="timeline"
                userRole={user.role}
              />
            </Paper>
          </Grid>
        </Grid>
      )}

      {user.role === 'Citizen' && tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Type Distribution:</strong> This view shows the types of incidents you have reported most frequently.
                This helps identify patterns in the types of issues you encounter in your community.
              </Typography>
            </Alert>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Type Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Shows the types of incidents you have reported most frequently.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="type-distribution"
                userRole={user.role}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Report Timeline
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Shows your incident reporting activity over time.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="timeline"
                userRole={user.role}
              />
            </Paper>
          </Grid>
        </Grid>
      )}

      {user.role === 'Citizen' && tabValue === 4 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Report Timeline:</strong> This view shows your incident reporting activity over time.
                This helps identify patterns in when you report incidents and can be useful for community planning.
              </Typography>
            </Alert>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Report Timeline
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Shows your incident reporting activity over time.
              </Typography>
              <Analytics 
                incidents={filteredIncidents} 
                view="timeline"
                userRole={user.role}
              />
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Snackbar for refresh notifications */}
      <Snackbar
        open={refreshOpen}
        autoHideDuration={3000}
        onClose={() => setRefreshOpen(false)}
        message={refreshMessage}
      />
    </Box>
  );
};

export default Dashboard;
// frontend/src/components/IncidentFeed.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Chip,
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const IncidentFeed = ({ incidents, isCitizen = false, detailedView = false, user }) => {
  const navigate = useNavigate();
  const getStatusColor = (status) => {
    switch (status) {
      case 'New':
        return 'error';
      case 'Acknowledged':
        return 'warning';
      case 'In Progress':
        return 'info';
      case 'Resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Fire':
        return '🔥';
      case 'Accident':
        return '🚗';
      case 'Crime':
        return '🚔';
      case 'Medical':
        return '🚑';
      case 'Natural Disaster':
        return '🌪️';
      case 'Public Event':
        return '🎉';
      case 'Infrastructure Failure':
        return '🚧';
      default:
        return '📋';
    }
  };

  // Check if incident was reported by current user
  const isUserReport = (incident) => {
    if (!user) return false;
    return incident.reportedBy === user.username || incident.detectedBy === user.id;
  };

  // Helper function to safely format coordinates
  const formatCoordinate = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const num = parseFloat(value);
    return isNaN(num) ? 'N/A' : num.toFixed(4);
  };

  if (incidents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {isCitizen 
            ? 'No incidents reported in your area. Be the first to report an issue!'
            : 'No incidents found matching your filters.'}
        </Typography>
      </Box>
    );
  }

  if (detailedView) {
    return (
      <List>
        {incidents.map((incident) => (
          <Card key={incident.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h5" sx={{ mr: 1 }}>
                    {getTypeIcon(incident.type)}
                  </Typography>
                  <Typography variant="h6" component="div">
                    {incident.type}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isCitizen && isUserReport(incident) && (
                    <Chip label="Your Report" size="small" color="primary" />
                  )}
                  <Chip 
                    label={incident.status} 
                    color={getStatusColor(incident.status)} 
                    size="small"
                  />
                </Box>
              </Box>
              
              <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                {incident.description}
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="body2">
                    {formatCoordinate(incident.latitude)}, {formatCoordinate(incident.longitude)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="body2">
                    {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                  </Typography>
                </Box>
                
                {isCitizen && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">
                      {isUserReport(incident) ? 'Reported by you' : 'Reported by community member'}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {!isCitizen && incident.reportedBy && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="body2">
                    Reported by: {incident.reportedBy}
                  </Typography>
                </Box>
              )}

              {incident.source && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <InfoIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="body2">
                    Source: {incident.source}
                  </Typography>
                </Box>
              )}
              
              {!isCitizen && incident.respondingDepartments && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Responding Departments:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {incident.respondingDepartments.map((dept) => (
                      <Chip key={dept} label={dept} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}

              {/* View Details Button */}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={() => navigate(`/incident/${incident.id}`)}
                >
                  View Details
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </List>
    );
  }

  return (
    <List>
      {incidents.map((incident) => (
        <React.Fragment key={incident.id}>
          <ListItem 
            alignItems="flex-start"
            sx={{ 
              '&:hover': { bgcolor: 'action.hover' },
              cursor: 'pointer'
            }}
          >
            <ListItemAvatar>
              <Avatar>
                {getTypeIcon(incident.type)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">
                    {incident.type}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isCitizen && isUserReport(incident) && (
                      <Chip label="Your Report" size="small" color="primary" />
                    )}
                    <Chip 
                      label={incident.status} 
                      color={getStatusColor(incident.status)} 
                      size="small"
                    />
                  </Box>
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="text.primary">
                    {incident.description.length > 100 
                      ? `${incident.description.substring(0, 100)}...` 
                      : incident.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <LocationIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="caption" sx={{ mr: 2 }}>
                      {formatCoordinate(incident.latitude)}, {formatCoordinate(incident.longitude)}
                    </Typography>
                    <TimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="caption">
                      {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                    </Typography>
                  </Box>
                  {!isCitizen && incident.reportedBy && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="caption">
                        Reported by: {incident.reportedBy}
                      </Typography>
                    </Box>
                  )}
                  {isCitizen && isUserReport(incident) && (
                    <Chip label="Your Report" size="small" color="primary" sx={{ mt: 1 }} />
                  )}
                </Box>
              }
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<VisibilityIcon />}
              onClick={() => navigate(`/incident/${incident.id}`)}
              sx={{ ml: 2, mt: 1 }}
            >
              View
            </Button>
          </ListItem>
          <Divider variant="inset" component="li" />
        </React.Fragment>
      ))}
    </List>
  );
};

export default IncidentFeed;
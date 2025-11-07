// frontend/src/components/IncidentFeed.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  Box,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { format } from 'date-fns';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const IncidentFeed = ({ incidents }) => {
  const navigate = useNavigate();

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

  const handleViewDetails = (id) => {
    navigate(`/incident/${id}`);
  };

  return (
    <List sx={{ width: '100%', maxHeight: 400, overflow: 'auto' }}>
      {incidents.length === 0 ? (
        <Typography variant="body2" sx={{ p: 2, textAlign: 'center' }}>
          No incidents found
        </Typography>
      ) : (
        incidents.map((incident, index) => (
          <React.Fragment key={incident.id}>
            <ListItem alignItems="flex-start" sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" component="span">
                        {incident.title}
                      </Typography>
                      <Chip label={incident.type} size="small" color="primary" />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" component={"span"}>
                        {format(new Date(incident.createdAt), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 1 }}>
                        <Chip 
                          label={incident.status} 
                          size="small" 
                          color={getStatusColor(incident.status)} 
                        />
                        <Chip 
                          label={incident.priority} 
                          size="small" 
                          color={getPriorityColor(incident.priority)} 
                        />
                      </Box>
                      {incident.address && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <LocationOnIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {incident.address}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
                <Tooltip title="View Details">
                  <IconButton 
                    edge="end" 
                    aria-label="view" 
                    onClick={() => handleViewDetails(incident.id)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItem>
            {index < incidents.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))
      )}
    </List>
  );
};

export default IncidentFeed;
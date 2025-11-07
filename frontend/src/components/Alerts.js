// frontend/src/components/Alerts.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Badge,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useSocket } from '../contexts/SocketContext';
import incidentService from '../services/incidentService';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const { socket } = useSocket();

  // --- 2. USE A REF TO TRACK MOUNTED STATE ---
  const isMounted = useRef(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await incidentService.getAlerts(); // We will create this service function
        if (isMounted.current) {
          setAlerts(data.alerts);
          setUnreadCount(data.alerts.filter(a => !a.isRead).length);
        }
    } catch (error) {
        console.error("Failed to fetch alerts:", error);
      }
    };
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('newAlert', (newAlert) => {
      // --- 4. CHECK THE REF BEFORE UPDATING STATE ---
      if (isMounted.current) {
        setAlerts(prev => [newAlert, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      socket.off('newAlert');
    };
  }, [socket]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAlertClick = async (alertId) => {
    // Mark alert as read
    try {
      await incidentService.markAlertAsRead(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isRead: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
    }
  };

  return (
    <Box>
      <IconButton color="inherit" onClick={handleMenuOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          style: { maxHeight: 300, width: '30ch' },
        }}
      >
        <Typography sx={{ p: 2, fontWeight: 'bold' }}>Notifications</Typography>
        <Divider />
        {alerts.length === 0 ? (
          <MenuItem>No new alerts</MenuItem>
        ) : (
          alerts.map((alert) => (
            <MenuItem
              key={alert.id}
              onClick={() => handleAlertClick(alert.id)}
              sx={{ fontWeight: alert.isRead ? 'normal' : 'bold' }}
            >
              <ListItemText primary={alert.message} secondary={new Date(alert.createdAt).toLocaleTimeString()} />
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
};

export default Alerts;
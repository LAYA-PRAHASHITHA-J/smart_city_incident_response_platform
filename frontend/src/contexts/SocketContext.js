// frontend/src/contexts/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const connectSocket = () => {
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');
    setSocket(newSocket);
  };
  
  useEffect(() => {
    // This effect will run whenever the user's authentication status changes.
    let newSocket = null;

    // If the user is authenticated, create a new socket connection.
    if (isAuthenticated && user) {
      newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
        // Join the appropriate department room
        if (user.role !== 'Admin' && user.role !== 'Citizen') {
          newSocket.emit('joinDepartment', user.role);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      // Set the socket in state so child components can use it
      setSocket(newSocket);
    } else {
      // If the user logs out, clear the socket state
      setSocket(null);
      setConnected(false);
    }

    // The cleanup function.
    // This will run when the component unmounts OR when the effect re-runs
    // (e.g., the user logs in or out).
    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, [isAuthenticated, user]); // Dependency array ensures this runs on login/logout

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
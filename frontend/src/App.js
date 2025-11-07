// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import IncidentDetails from './pages/IncidentDetails';
import Layout from './components/Layout';
import CitizenReport from './pages/CitizenReport';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <SocketProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} /> {/* <-- Add Register Route */}
                <Route path="/report" element={<CitizenReport />} /> {/* <-- Add the new route */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="incident/:id" element={<IncidentDetails />} />
                </Route>
              </Routes>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
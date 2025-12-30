// frontend/src/components/Analytics.js

import React from 'react';
import { Typography, Box } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '10px', 
        border: '1px solid #ccc',
        borderRadius: '4px'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{`${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: 0, color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = ({ incidents, view, userRole, multiDepartmentIncidents }) => {
  // Validate incidents data
  if (!incidents || !Array.isArray(incidents)) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No incident data available.
        </Typography>
      </Box>
    );
  }

  // Citizen-specific analytics
  if (userRole === 'Citizen') {
    // Status distribution for citizen's reports
    if (view === 'status-distribution') {
      const statusCounts = {};
      incidents.forEach(incident => {
        if (incident && incident.status) {
          statusCounts[incident.status] = (statusCounts[incident.status] || 0) + 1;
        }
      });
      
      const data = Object.entries(statusCounts).map(([status, count]) => ({
        name: status,
        value: count
      }));
      
      return (
        <Box>
          {data.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No incident data available.
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
            This chart shows status distribution of your reported incidents.
          </Typography>
        </Box>
      );
    }
    
    // Type distribution for citizen's reports
    if (view === 'type-distribution') {
      const typeCounts = {};
      incidents.forEach(incident => {
        if (incident && incident.type) {
          typeCounts[incident.type] = (typeCounts[incident.type] || 0) + 1;
        }
      });
      
      const data = Object.entries(typeCounts).map(([type, count]) => ({
        name: type,
        value: count
      }));
      
      return (
        <Box>
          {data.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No incident data available.
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ 
                    value: 'Number of Incidents', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8" 
                  name="Incidents"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
            This chart shows types of incidents you have reported.
          </Typography>
        </Box>
      );
    }
    
    // Timeline of citizen's reports
    if (view === 'timeline') {
      const timelineData = {};
      incidents.forEach(incident => {
        if (incident && incident.createdAt) {
          const month = new Date(incident.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          
          if (!timelineData[month]) {
            timelineData[month] = 0;
          }
          
          timelineData[month]++;
        }
      });
      
      const data = Object.entries(timelineData)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => new Date(a.month) - new Date(b.month));
      
      return (
        <Box>
          {data.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No incident data available.
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ 
                    value: 'Number of Incidents', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Incidents"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
            This chart shows your incident reporting activity over time.
          </Typography>
        </Box>
      );
    }
  }

  // Department collaboration view
  if (view === 'collaboration') {
    const departmentLinks = {};
    
    incidents.forEach(incident => {
      if (incident && incident.type && multiDepartmentIncidents) {
        const departments = multiDepartmentIncidents[incident.type] || [incident.type];
        if (departments.length > 1) {
          for (let i = 0; i < departments.length; i++) {
            for (let j = i + 1; j < departments.length; j++) {
              const link = `${departments[i]} ↔ ${departments[j]}`;
              departmentLinks[link] = (departmentLinks[link] || 0) + 1;
            }
          }
        }
      }
    });
    
    const collaborationData = Object.entries(departmentLinks)
      .map(([link, count]) => ({
        collaboration: link,
        incidents: count,
        frequency: count > 5 ? 'High' : count > 2 ? 'Medium' : 'Low'
      }))
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 10);
    
    return (
      <Box>
        {collaborationData.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No multi-department collaborations found in the selected period.
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={collaborationData}
              margin={{ top: 20, right: 30, left: 80, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="collaboration" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ 
                  value: 'Number of Joint Incidents', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="incidents" 
                fill="#8884d8" 
                name="Joint Incidents"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
          This chart shows which departments work together most frequently. Higher bars indicate more collaboration.
        </Typography>
      </Box>
    );
  }

  // Response time analysis
  if (view === 'response-time') {
    const responseTimeData = {};
    
    incidents.forEach(incident => {
      if (incident && incident.type && incident.responseTime) {
        if (!responseTimeData[incident.type]) {
          responseTimeData[incident.type] = {
            total: 0,
            count: 0,
            multiDept: 0,
            multiDeptCount: 0
          };
        }
        
        responseTimeData[incident.type].total += incident.responseTime;
        responseTimeData[incident.type].count++;
        
        const departments = multiDepartmentIncidents ? 
          (multiDepartmentIncidents[incident.type] || [incident.type]) : 
          [incident.type];
        
        if (departments.length > 1) {
          responseTimeData[incident.type].multiDept += incident.responseTime;
          responseTimeData[incident.type].multiDeptCount++;
        }
      }
    });
    
    const chartData = Object.entries(responseTimeData).map(([type, data]) => ({
      incidentType: type,
      averageResponse: Math.round(data.total / data.count),
      multiDeptResponse: data.multiDeptCount > 0 ? 
        Math.round(data.multiDept / data.multiDeptCount) : 0,
      singleDeptResponse: data.count > data.multiDeptCount ?
        Math.round((data.total - data.multiDept) / (data.count - data.multiDeptCount)) : 0
    }));
    
    return (
      <Box>
        {chartData.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No response time data available.
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="incidentType" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ 
                  value: 'Average Response Time (minutes)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="averageResponse" 
                fill="#8884d8" 
                name="Overall Average"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="multiDeptResponse" 
                fill="#82ca9d" 
                name="Multi-Department"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
          Response time measures how quickly departments respond to incidents. Lower bars indicate faster response.
        </Typography>
      </Box>
    );
  }

  // Resolution rate by department
  if (view === 'resolution-rate') {
    const resolutionData = {};
    
    incidents.forEach(incident => {
      if (incident && incident.type && incident.status) {
        const departments = multiDepartmentIncidents ? 
          (multiDepartmentIncidents[incident.type] || [incident.type]) : 
          [incident.type];
        
        departments.forEach(dept => {
          if (!resolutionData[dept]) {
            resolutionData[dept] = {
              total: 0,
              resolved: 0
            };
          }
          
          resolutionData[dept].total++;
          if (incident.status === 'Resolved') {
            resolutionData[dept].resolved++;
          }
        });
      }
    });
    
    const chartData = Object.entries(resolutionData)
      .map(([dept, data]) => ({
        department: dept,
        resolutionRate: Math.round((data.resolved / data.total) * 100),
        totalIncidents: data.total,
        resolvedIncidents: data.resolved
      }))
      .sort((a, b) => b.resolutionRate - a.resolutionRate);
    
    return (
      <Box>
        {chartData.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No resolution data available.
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="department" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ 
                  value: 'Resolution Rate (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
                domain={[0, 100]}
              />
              <Tooltip 
                content={<CustomTooltip />}
                formatter={(value, name) => [
                  name === 'resolutionRate' ? `${value}%` : value,
                  name === 'resolutionRate' ? 'Resolution Rate' : 'Incidents'
                ]}
              />
              <Bar 
                dataKey="resolutionRate" 
                fill="#82ca9d"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
          Resolution rate shows percentage of incidents successfully resolved by each department.
          Higher bars indicate better performance.
        </Typography>
      </Box>
    );
  }

  // Incident trends - ROBUST VERSION
  if (view === 'trends') {
    // Validate input data
    if (!incidents || incidents.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No trend data available for the selected period.
          </Typography>
        </Box>
      );
    }

    // Define all possible incident types to ensure consistent data
    const allIncidentTypes = [
      'Accident', 'Fire', 'Crime', 'Medical', 
      'Natural Disaster', 'Public Event', 'Infrastructure Failure'
    ];

    // Create monthly data with all types initialized
    const monthlyData = {};
    incidents.forEach(incident => {
      // Skip invalid incidents
      if (!incident || !incident.createdAt || !incident.type) {
        return;
      }

      const month = new Date(incident.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      // Initialize month if not exists
      if (!monthlyData[month]) {
        monthlyData[month] = {};
        // Initialize all incident types to 0 for this month
        allIncidentTypes.forEach(type => {
          monthlyData[month][type] = 0;
        });
      }
      
      // Increment the counter for this incident type
      if (monthlyData[month][incident.type] !== undefined) {
        monthlyData[month][incident.type]++;
      }
    });
    
    // Convert to chart format
    const chartData = Object.entries(monthlyData)
      .map(([month, types]) => {
        const monthData = { month };
        // Ensure all types are present in each month
        allIncidentTypes.forEach(type => {
          monthData[type] = types[type] || 0;
        });
        return monthData;
      })
      .sort((a, b) => new Date(a.month) - new Date(b.month));
    
    return (
      <Box>
        {chartData.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No trend data available for the selected period.
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ 
                  value: 'Number of Incidents', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Accident" 
                stroke="#FF8042" 
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={true}
              />
              <Line 
                type="monotone" 
                dataKey="Fire" 
                stroke="#FF0000" 
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={true}
              />
              <Line 
                type="monotone" 
                dataKey="Crime" 
                stroke="#0000FF" 
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={true}
              />
              <Line 
                type="monotone" 
                dataKey="Medical" 
                stroke="#00C49F" 
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
          This chart shows incident trends over time. Each line represents a different incident type.
          Use this to identify patterns and seasonal variations.
        </Typography>
      </Box>
    );
  }

  // Default fallback
  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="body2" color="text.secondary">
        Select a view to see analytics data.
      </Typography>
    </Box>
  );
};

export default Analytics;
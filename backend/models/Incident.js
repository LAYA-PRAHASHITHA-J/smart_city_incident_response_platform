// backend/models/Incident.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Incident = sequelize.define('Incident', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('Fire', 'Accident', 'Crime', 'Medical'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('New', 'Acknowledged', 'In Progress', 'Resolved'),
    defaultValue: 'New'
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    defaultValue: 'Medium'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reportedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source: {
    type: DataTypes.ENUM('CCTV', 'Citizen App', 'Sensor', 'Manual'),
    allowNull: false
  },
  aiModel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  aiConfidence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Incident;
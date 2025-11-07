// backend/models/Alert.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('Info', 'Warning', 'Error', 'Success'),
    allowNull: false,
    defaultValue: 'Info'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // The user this alert is for. If null, it's a system-wide alert for admins.
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Optional link to a related incident
  relatedIncidentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Incidents',
      key: 'id'
    }
  }
});

module.exports = Alert;
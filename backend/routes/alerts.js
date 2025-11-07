// backend/routes/alerts.js
const express = require('express');
const Alert = require('../models/Alert');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const router = express.Router();

// GET /api/alerts - Get alerts for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, offset = 0, isRead } = req.query;
    
    const whereClause = {
      [sequelize.Op.or]: [
        { userId: req.user.id }, // Alerts for this specific user
        { userId: null }         // System-wide alerts
      ]
    };

    // Filter by read status if provided
    if (isRead !== undefined) {
      whereClause.isRead = isRead === 'true';
    }

    const { count, rows: alerts } = await Alert.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      alerts,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/alerts - Create a new alert (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { message, type, userId, relatedIncidentId } = req.body;

    const newAlert = await Alert.create({
      message,
      type: type || 'Info',
      userId: userId || null, // If userId is not provided, it's a system-wide alert
      relatedIncidentId
    });

    // Emit real-time notification to the specific user or all admins
    const io = req.app.get('io');
    if (userId) {
      // Send to a specific user's room
      io.to(`user_${userId}`).emit('newAlert', newAlert);
    } else {
      // Send to all admin users in the 'Admin' room
      io.to('Admin').emit('newAlert', newAlert);
    }

    res.status(201).json(newAlert);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/alerts/:id/read - Mark an alert as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const [affectedRows] = await Alert.update(
      { isRead: true },
      {
        where: {
          id: req.params.id,
          userId: req.user.id // Ensure user can only mark their own alerts as read
        }
      }
    );

    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Alert not found or does not belong to you' });
    }

    const updatedAlert = await Alert.findByPk(req.params.id);
    res.json(updatedAlert);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
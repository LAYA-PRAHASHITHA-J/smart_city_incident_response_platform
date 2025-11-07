// backend/routes/users.js
const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const router = express.Router();

// Apply authentication and admin authorization to all routes in this file
router.use(authMiddleware, adminMiddleware);

// GET /api/users - Get all users with pagination
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, role } = req.query;
    
    const whereClause = {};
    if (role) {
      whereClause.role = role;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] }, // Exclude password from results
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      users,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:id - Get a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id - Update a user's information
router.put('/:id', async (req, res) => {
  try {
    const { username, email, role, department, isActive } = req.body;
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent an admin from deactivating themselves
    if (req.user.id === parseInt(req.params.id) && isActive === false) {
        return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    await user.update({
      username,
      email,
      role,
      department,
      isActive
    });

    // Return updated user without password
    const updatedUser = user.get({ plain: true });
    delete updatedUser.password;

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    // Handle potential validation errors (e.g., duplicate email)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email or username already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/:id/deactivate - Deactivate a user account
router.patch('/:id/deactivate', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent an admin from deactivating themselves
        if (req.user.id === user.id) {
            return res.status(400).json({ message: 'You cannot deactivate your own account' });
        }

        await user.update({ isActive: false });

        res.json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users/assignable - Get users that can be assigned incidents
router.get('/assignable', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { incidentType } = req.query; // Optional: filter by incident type

    let whereClause = { isActive: true };
    
    // If an incident type is provided, we can suggest users from relevant departments
    if (incidentType) {
        const relevantRoles = [incidentType, 'Admin']; // Admins can be assigned to anything
        whereClause.role = { [Sequelize.Op.in]: relevantRoles };
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'username', 'role', 'department'], // Only send necessary fields
      order: [['role', 'ASC'], ['username', 'ASC']]
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
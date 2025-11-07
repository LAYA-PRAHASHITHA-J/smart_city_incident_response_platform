// backend/routes/incidents.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Sequelize, Op } = require('sequelize'); // Import Op for query operators
const Incident = require('../models/Incident');
const Alert = require('../models/Alert'); 
const authMiddleware = require('../middleware/auth');
const axios = require('axios');
const router = express.Router();

// --- PERMISSIONS MAP ---
// Defines which incident types each role can access.
const DEPARTMENT_PERMISSIONS = {
  'Police': ['Crime', 'Accident'],
  'Fire': ['Fire', 'Accident'],
  'Medical': ['Medical', 'Accident'],
  'Traffic': ['Accident'],
  'Admin': ['Fire', 'Accident', 'Crime', 'Medical'], // Admins can see all types
  'Citizen': [] // Citizens don't get departmental access via this logic
};

// ... (keep the multer and file upload setup as is)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadsDir); },
  filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage });

// Middleware to check departmental permissions
const checkIncidentPermission = (incident, userRole) => {
  if (userRole === 'Admin') {
    return true; // Admins can see everything
  }
  const allowedIncidents = DEPARTMENT_PERMISSIONS[userRole] || [];
  return allowedIncidents.includes(incident.type);
};

// GET all incidents
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type, status, limit = 50, offset = 0 } = req.query;
    let whereClause = {};

    // --- CORRECTED LOGIC ---
    // If not an admin, filter incidents based on departmental permissions
    if (req.user.role !== 'Admin') {
      const allowedIncidents = DEPARTMENT_PERMISSIONS[req.user.role] || [];
      // If the user has no permissions, return an empty list
      if (allowedIncidents.length === 0) {
        return res.json({ incidents: [], total: 0, limit, offset });
      }
      whereClause.type = { [Op.in]: allowedIncidents };
    }

    // Apply additional filters from the dropdowns
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    const incidents = await Incident.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      incidents: incidents.rows,
      total: incidents.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a single incident by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // --- CORRECTED LOGIC ---
    // Use the permission helper function to check access
    if (!checkIncidentPermission(incident, req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to view this incident' });
    }

    res.json(incident);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new incident
router.post('/', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      latitude,
      longitude,
      address,
      source
    } = req.body;

    // Create incident initially with a default priority
    let incidentPriority = req.body.priority || 'Medium';
    let aiModel = null;
    let aiConfidence = null;

    // If media file is uploaded, send to AI service for analysis
    if (req.file) {
      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path));
        
        const aiResponse = await axios.post(`${aiServiceUrl}/analyze/image`, formData, {
          headers: { ...formData.getHeaders() },
          timeout: 10000
        });
        
        // --- UPDATE PRIORITY FROM AI ---
        // Use the priority determined by the AI service
        if (aiResponse.data.priority) {
          incidentPriority = aiResponse.data.priority;
        }
        
        aiModel = aiResponse.data.model;
        aiConfidence = aiResponse.data.confidence;

      } catch (aiError) {
        console.error('AI service error:', aiError.message);
        // Keep the default priority if AI fails
      }
    }

    // Create incident initially without AI data
    const incident = await Incident.create({
      title,
      description,
      type,
      priority: incidentPriority,
      latitude,
      longitude,
      address,
      source: source || 'Manual',
      reportedBy: req.user.username,
      mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
      aiModel,
      aiConfidence
    });

    // Create an alert if the incident is high or critical priority
    if (incident.priority === 'High' || incident.priority === 'Critical') {
      try {
        await Alert.create({
          message: `New ${incident.priority} Priority Incident: ${incident.title}`,
          type: incident.priority === 'Critical' ? 'Error' : 'Warning',
          relatedIncidentId: incident.id
          // userId is null, so it's a system-wide alert for all logged-in users
        });
      } catch(alertError) {
        console.error("Failed to create alert:", alertError);
      }
    }

    // If media file is uploaded, send to AI service for analysis
    if (req.file) {
      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path));
        
        const aiResponse = await axios.post(`${aiServiceUrl}/analyze/image`, formData, {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 10000 // 10-second timeout
        });
        
        // Update incident with AI analysis results
        await incident.update({
          aiModel: aiResponse.data.model,
          aiConfidence: aiResponse.data.confidence
        });

      } catch (aiError) {
        console.error('AI service error:', aiError.message);
        // The incident is still created, just without AI data. We don't fail the whole request.
      }
    }
    
    // Emit real-time update to connected clients
    const io = req.app.get('io');
    io.emit('newIncident', incident);
    
    // Send to specific department rooms
    io.to(type).emit('departmentIncident', incident);
    
    res.status(201).json(incident);
  } catch (error) {
    console.error('Incident Creation Error:', error);
    res.status(500).json({ message: 'Failed to create incident.' });
  }
});

// Update incident status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    // --- CORRECTED LOGIC ---
    // Check if user has permission to update this incident
    if (!checkIncidentPermission(incident, req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update this incident' });
    }
    
    // Update incident
    const updateData = { status };
    if (status === 'Resolved') {
      updateData.resolvedAt = new Date();
    }
    
    await incident.update(updateData);
    
    // Emit real-time update to connected clients
    const io = req.app.get('io');
    io.emit('incidentUpdated', incident);
    
    res.json(incident);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign incident to user
router.patch('/:id/assign', authMiddleware, async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    // --- CORRECTED LOGIC ---
    // Check if user has permission to assign this incident
    if (!checkIncidentPermission(incident, req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to assign this incident' });
    }
    
    // Update incident
    await incident.update({ assignedTo });
    
    // Emit real-time update to connected clients
    const io = req.app.get('io');
    io.emit('incidentAssigned', incident);
    
    res.json(incident);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
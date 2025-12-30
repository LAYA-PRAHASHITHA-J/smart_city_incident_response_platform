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
const User = require('../models/User');  // <-- add this import if not present


// --- PERMISSIONS MAP ---
// Defines which incident types each role can access.
const DEPARTMENT_PERMISSIONS = {
  'Police': ['Crime', 'Accident'],
  'Fire': ['Fire', 'Accident'],
  'Medical': ['Medical', 'Accident'],
  'Traffic': ['Accident'],
  'Admin': ['Fire', 'Accident', 'Crime', 'Medical'], // Admins can see all types
  'Citizen': [] // Citizens handled separately with viewMode logic
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

// Get incidents reported by the logged-in user
router.get('/my-incidents', authMiddleware, async (req, res) => {

  try {
    const userId = req.user.id;  // From JWT token
    const username = req.user.username;

    console.log(`[GET /my-incidents] User ${username} (ID: ${userId}) requesting their incidents`);
    console.log(`[GET /my-incidents] Searching for: reportedBy='${username}' OR detectedBy=${userId}`);

    // Find incidents where user is either the reporter (by username) OR detector (by ID)
    const incidents = await Incident.findAll({
      where: { 
        [Op.or]: [
          { reportedBy: username },  // Match by username for citizen reports
          { detectedBy: userId }     // Match by user ID for AI/system detections
        ]
      },
      include: [
        {
          model: User,
          as: 'detector',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`[GET /my-incidents] Found ${incidents.length} incidents for user ${username}`);
    if (incidents.length > 0) {
      console.log(`[GET /my-incidents] Sample: ID=${incidents[0].id}, ReportedBy='${incidents[0].reportedBy}', DetectedBy=${incidents[0].detectedBy}`);
    } else {
      console.log(`[GET /my-incidents] No incidents found. User may not have reported any incidents yet.`);
    }

    res.json({
      message: incidents.length > 0 ? 'Your reported incidents' : 'You have not reported any incidents yet',
      incidents: incidents
    });
  } catch (error) {
    console.error('[GET /my-incidents] Error fetching user incidents:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG ENDPOINT - List all incidents with reporter info (for troubleshooting)
router.get('/debug/all-incidents', authMiddleware, async (req, res) => {
  try {
    const incidents = await Incident.findAll({
      attributes: ['id', 'type', 'reportedBy', 'detectedBy', 'source', 'createdAt'],
      order: [['id', 'ASC']],
      limit: 20
    });
    
    console.log('[DEBUG] All incidents in database:');
    incidents.forEach(i => {
      console.log(`  ID:${i.id}, Type:${i.type}, ReportedBy:'${i.reportedBy}', DetectedBy:${i.detectedBy}, Source:${i.source}`);
    });
    
    res.json({ incidents });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific incident details
router.get('/incident/:id', async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'detector',
          attributes: ['id', 'username', 'email', 'role']
        },
        {
          model: Alert,
          as: 'alerts'
        }
      ]
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Check authorization - user can only see their own incidents
    if (incident.detectedBy !== req.user.id && req.user.role !== 'Admin' && req.user.role !== 'Operator') {
      return res.status(403).json({ error: 'Not authorized to view this incident' });
    }

    res.json(incident);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET all incidents
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type, status, limit = 50, offset = 0, viewMode } = req.query;
    let whereClause = {};

    console.log(`[GET /incidents] User: ${req.user.username} (${req.user.role}), viewMode: ${viewMode}`);

    // --- HANDLE CITIZEN REQUESTS ---
    if (req.user.role === 'Citizen') {
      // For citizens, apply different filtering logic based on view mode
      if (viewMode === 'myreports') {
        // Only incidents reported by this citizen
        whereClause = {
          [Op.or]: [
            { reportedBy: req.user.username },
            { detectedBy: req.user.id }
          ]
        };
        console.log('[GET /incidents] Citizen myreports filter:', JSON.stringify(whereClause));
      } else if (viewMode === 'nearby') {
        // Return all public incidents (nearby filtering will be done on frontend with geolocation)
        // Exclude internal/sensitive incidents
        whereClause.status = { [Op.ne]: 'Internal' };
      } else {
        // viewMode === 'all' or not specified: show all public incidents
        // Exclude internal/sensitive incidents
        whereClause.status = { [Op.ne]: 'Internal' };
      }
    } else {
      // --- HANDLE ADMIN AND DEPARTMENT USERS ---
      // If not an admin, filter incidents based on departmental permissions
      if (req.user.role !== 'Admin') {
        const allowedIncidents = DEPARTMENT_PERMISSIONS[req.user.role] || [];
        console.log(`[GET /incidents] Department user ${req.user.role} can see types:`, allowedIncidents);
        // If the user has no permissions, return an empty list
        if (allowedIncidents.length === 0) {
          return res.json({ incidents: [], total: 0, limit, offset });
        }
        whereClause.type = { [Op.in]: allowedIncidents };
      } else {
        console.log('[GET /incidents] Admin user - can see all incidents');
      }
    }

    // Apply additional filters from the dropdowns (override type filter if specified)
    if (type) {
      whereClause.type = type;
      console.log('[GET /incidents] Additional type filter applied:', type);
    }
    if (status) {
      whereClause.status = status;
      console.log('[GET /incidents] Additional status filter applied:', status);
    }

    const incidents = await Incident.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'detector',
          attributes: ['id', 'username', 'email', 'role']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    console.log(`[GET /incidents] Found ${incidents.count} incidents for ${req.user.username}`);
    
    // Log sample incident for department users to show they're seeing citizen reports
    if (req.user.role !== 'Citizen' && req.user.role !== 'Admin' && incidents.count > 0) {
      const sampleIncident = incidents.rows[0];
      console.log(`[GET /incidents] Sample incident: ID=${sampleIncident.id}, Type=${sampleIncident.type}, Source=${sampleIncident.source}, ReportedBy=${sampleIncident.reportedBy}`);
    }

    res.json({
      incidents: incidents.rows,
      total: incidents.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET a single incident by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'detector',
          attributes: ['id', 'username', 'email', 'role']
        }
      ]
    });

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    console.log(`[GET /:id] User ${req.user.username} (${req.user.role}) requesting incident ${req.params.id} (Type: ${incident.type}, Source: ${incident.source})`);

    // --- AUTHORIZATION LOGIC ---
    // Allow access if:
    // 1. User is Admin
    // 2. User is department staff and incident type matches their department
    // 3. User is the citizen who reported it
    const isAdmin = req.user.role === 'Admin';
    const isDepartmentMatch = checkIncidentPermission(incident, req.user.role);
    const isReporter = incident.reportedBy === req.user.username || incident.detectedBy === req.user.id;
    
    if (!isAdmin && !isDepartmentMatch && !isReporter) {
      console.log(`[GET /:id] Access denied for ${req.user.username}`);
      return res.status(403).json({ message: 'Not authorized to view this incident' });
    }

    console.log(`[GET /:id] Access granted for ${req.user.username}`);
    res.json(incident);
  } catch (error) {
    console.error('[GET /:id] Error:', error);
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
      detectedBy: req.user.id,
      mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
      aiModel,
      aiConfidence
    });

    console.log(`[POST /incidents] Created incident ID=${incident.id} by user='${req.user.username}' (ID=${req.user.id}), reportedBy='${incident.reportedBy}', detectedBy=${incident.detectedBy}`);

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
    
    console.log(`[PATCH /:id/status] User ${req.user.username} (${req.user.role}) updating incident ${req.params.id} to status: ${status}`);
    
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    console.log(`[PATCH /:id/status] Incident type: ${incident.type}, Source: ${incident.source}, ReportedBy: ${incident.reportedBy}`);
    
    // --- CORRECTED LOGIC ---
    // Check if user has permission to update this incident
    if (!checkIncidentPermission(incident, req.user.role)) {
      console.log(`[PATCH /:id/status] Permission denied for ${req.user.role} to update ${incident.type} incident`);
      return res.status(403).json({ message: 'Not authorized to update this incident' });
    }
    
    console.log(`[PATCH /:id/status] Permission granted - updating incident`);
    
    // Update incident
    const updateData = { status };
    if (status === 'Resolved') {
      updateData.resolvedAt = new Date();
    }
    
    await incident.update(updateData);
    
    // Emit real-time update to connected clients
    const io = req.app.get('io');
    io.emit('incidentUpdated', incident);
    
    console.log(`[PATCH /:id/status] Incident ${req.params.id} successfully updated to ${status}`);
    
    res.json(incident);
  } catch (error) {
    console.error('[PATCH /:id/status] Error:', error);
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
const express = require('express');
const router = express.Router();
const database = require('../models/database');
const encryption = require('../utils/encryption');

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required'
      });
    }

    const decoded = encryption.verifyJWT(token);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Get admin user from database
    const adminUser = await database.getAdminUser(username);
    
    if (!adminUser || !encryption.comparePassword(password, adminUser.password_hash)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await database.updateAdminLastLogin(username);
    
    // Create JWT token
    const token = encryption.createJWT({
      username: adminUser.username,
      id: adminUser.id
    });
    
    res.json({
      success: true,
      token,
      admin: {
        username: adminUser.username,
        last_login: adminUser.last_login
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all licenses (admin only)
router.get('/licenses', authenticateAdmin, async (req, res) => {
  try {
    const licenses = await database.getAllLicenses();
    
    res.json({
      success: true,
      licenses: licenses.map(license => ({
        id: license.id,
        license_key: license.license_key,
        user_email: license.user_email,
        user_name: license.user_name,
        created_at: license.created_at,
        expires_at: license.expires_at,
        is_active: license.is_active,
        last_used: license.last_used,
        usage_count: license.usage_count,
        machine_id: license.machine_id,
        notes: license.notes
      }))
    });
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create license (admin only)
router.post('/licenses', authenticateAdmin, async (req, res) => {
  try {
    const { user_email, user_name, duration_days = 365, notes } = req.body;
    
    if (!user_email || !user_name) {
      return res.status(400).json({
        success: false,
        error: 'User email and name are required'
      });
    }

    // Create license data
    const licenseData = encryption.createLicenseData(user_email, user_name, duration_days);
    
    if (notes) {
      licenseData.notes = notes;
    }
    
    // Save to database
    const savedLicense = await database.createLicense(licenseData);
    
    // Log the creation
    await database.logLicenseAction(
      savedLicense.license_key,
      'admin_license_created',
      null,
      req.ip,
      req.get('User-Agent'),
      JSON.stringify({ 
        admin: req.admin.username,
        user_email, 
        user_name, 
        duration_days 
      })
    );
    
    res.status(201).json({
      success: true,
      license: {
        id: savedLicense.id,
        key: savedLicense.license_key,
        user_email: savedLicense.user_email,
        user_name: savedLicense.user_name,
        expires_at: savedLicense.expires_at,
        created_at: savedLicense.created_at,
        notes: savedLicense.notes
      }
    });
  } catch (error) {
    console.error('Admin license creation error:', error);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({
        success: false,
        error: 'License key already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

// Revoke license (admin only)
router.post('/licenses/revoke', authenticateAdmin, async (req, res) => {
  try {
    const { license_key } = req.body;
    
    if (!license_key) {
      return res.status(400).json({
        success: false,
        error: 'License key is required'
      });
    }

    const result = await database.revokeLicense(license_key);
    
    if (result.changes > 0) {
      // Log the revocation
      await database.logLicenseAction(
        license_key,
        'admin_license_revoked',
        null,
        req.ip,
        req.get('User-Agent'),
        JSON.stringify({ admin: req.admin.username })
      );
      
      res.json({
        success: true,
        message: 'License revoked successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }
  } catch (error) {
    console.error('Admin license revocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get license statistics (admin only)
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const stats = await database.getLicenseStats();
    
    res.json({
      success: true,
      stats: {
        total_licenses: stats.total_licenses,
        active_licenses: stats.active_licenses,
        revoked_licenses: stats.revoked_licenses,
        expired_licenses: stats.expired_licenses,
        used_licenses: stats.used_licenses,
        unused_licenses: stats.total_licenses - stats.used_licenses
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get license logs (admin only)
router.get('/logs', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const logs = await database.getLicenseLogs(parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update license (admin only)
router.put('/licenses/:licenseKey', authenticateAdmin, async (req, res) => {
  try {
    const { licenseKey } = req.params;
    const { user_email, user_name, notes, is_active } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        error: 'License key is required'
      });
    }

    const updateData = {};
    if (user_email !== undefined) updateData.user_email = user_email;
    if (user_name !== undefined) updateData.user_name = user_name;
    if (notes !== undefined) updateData.notes = notes;
    if (is_active !== undefined) updateData.is_active = is_active;

    const result = await database.updateLicense(licenseKey, updateData);
    
    if (result.changes > 0) {
      // Log the update
      await database.logLicenseAction(
        licenseKey,
        'admin_license_updated',
        null,
        req.ip,
        req.get('User-Agent'),
        JSON.stringify({ 
          admin: req.admin.username,
          updates: updateData
        })
      );
      
      res.json({
        success: true,
        message: 'License updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }
  } catch (error) {
    console.error('Admin license update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete license (admin only)
router.delete('/licenses/:licenseKey', authenticateAdmin, async (req, res) => {
  try {
    const { licenseKey } = req.params;
    
    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        error: 'License key is required'
      });
    }

    const result = await database.deleteLicense(licenseKey);
    
    if (result.changes > 0) {
      // Log the deletion
      await database.logLicenseAction(
        licenseKey,
        'admin_license_deleted',
        null,
        req.ip,
        req.get('User-Agent'),
        JSON.stringify({ admin: req.admin.username })
      );
      
      res.json({
        success: true,
        message: 'License deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }
  } catch (error) {
    console.error('Admin license deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;

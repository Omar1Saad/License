const express = require('express');
const router = express.Router();
const database = require('../models/database');
const encryption = require('../utils/encryption');

// Validate license endpoint
router.post('/validate', async (req, res) => {
  try {
    const { license_key, machine_id } = req.body;
    
    if (!license_key) {
      return res.status(400).json({
        success: false,
        error: 'License key is required'
      });
    }

    // Generate machine ID if not provided
    const machineId = machine_id || encryption.generateMachineId();
    
    // Validate license
    const result = await database.validateLicense(license_key, machineId);
    
    // Log the validation attempt
    await database.logLicenseAction(
      license_key,
      'validation_attempt',
      machineId,
      req.ip,
      req.get('User-Agent'),
      JSON.stringify({ success: result.valid, reason: result.reason })
    );
    
    if (result.valid) {
      res.json({
        success: true,
        license: {
          key: result.license.license_key,
          user_email: result.license.user_email,
          user_name: result.license.user_name,
          expires_at: result.license.expires_at,
          is_active: result.license.is_active
        },
        machine_id: machineId
      });
    } else {
      res.status(403).json({
        success: false,
        error: result.reason,
        machine_id: machineId
      });
    }
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create license endpoint (admin only)
router.post('/create', async (req, res) => {
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
    
    // Add notes if provided
    if (notes) {
      licenseData.notes = notes;
    }
    
    // Save to database
    const savedLicense = await database.createLicense(licenseData);
    
    // Log the creation
    await database.logLicenseAction(
      savedLicense.license_key,
      'license_created',
      null,
      req.ip,
      req.get('User-Agent'),
      JSON.stringify({ user_email, user_name, duration_days })
    );
    
    res.status(201).json({
      success: true,
      license: {
        key: savedLicense.license_key,
        user_email: savedLicense.user_email,
        user_name: savedLicense.user_name,
        expires_at: savedLicense.expires_at,
        created_at: savedLicense.created_at
      }
    });
  } catch (error) {
    console.error('License creation error:', error);
    
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

// Get license info endpoint
router.get('/info/:licenseKey', async (req, res) => {
  try {
    const { licenseKey } = req.params;
    
    const result = await database.validateLicense(licenseKey, null);
    
    if (result.valid) {
      res.json({
        success: true,
        license: {
          key: result.license.license_key,
          user_email: result.license.user_email,
          user_name: result.license.user_name,
          expires_at: result.license.expires_at,
          created_at: result.license.created_at,
          last_used: result.license.last_used,
          usage_count: result.license.usage_count,
          is_active: result.license.is_active
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.reason
      });
    }
  } catch (error) {
    console.error('License info error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Revoke license endpoint (admin only)
router.post('/revoke', async (req, res) => {
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
        'license_revoked',
        null,
        req.ip,
        req.get('User-Agent'),
        'License revoked by admin'
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
    console.error('License revocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get license statistics
router.get('/stats', async (req, res) => {
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
    console.error('License stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;

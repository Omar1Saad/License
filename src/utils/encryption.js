const crypto = require('crypto');
const config = require('../config');

class EncryptionUtils {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(config.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  }

  // Generate a random license key
  generateLicenseKey() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    const combined = timestamp + random;
    
    // Create a hash and take first 24 characters
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    return hash.substring(0, 24).toUpperCase();
  }

  // Generate machine ID (similar to electron app)
  generateMachineId() {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    let macAddress = '';
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
          macAddress = iface.mac;
          break;
        }
      }
      if (macAddress) break;
    }
    
    // Fallback to hostname if no MAC address found
    if (!macAddress) {
      macAddress = os.hostname();
    }
    
    return crypto.createHash('sha256').update(macAddress).digest('hex').substring(0, 16);
  }

  // Encrypt data
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.key);
      cipher.setAAD(Buffer.from('license-data'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  // Decrypt data
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      
      const decipher = crypto.createDecipher(this.algorithm, this.key);
      decipher.setAAD(Buffer.from('license-data'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  // Create license data structure
  createLicenseData(userEmail, userName, durationDays = 365) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    
    return {
      license_key: this.generateLicenseKey(),
      user_email: userEmail,
      user_name: userName,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      duration_days: durationDays,
      version: '1.0.0'
    };
  }

  // Validate license data structure
  validateLicenseData(licenseData) {
    const requiredFields = ['license_key', 'user_email', 'expires_at'];
    
    for (const field of requiredFields) {
      if (!licenseData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate expiration date
    const expiresAt = new Date(licenseData.expires_at);
    if (isNaN(expiresAt.getTime())) {
      throw new Error('Invalid expiration date');
    }
    
    return true;
  }

  // Create JWT token for admin authentication
  createJWT(payload) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, config.JWT_SECRET, { 
      expiresIn: config.JWT_EXPIRES_IN 
    });
  }

  // Verify JWT token
  verifyJWT(token) {
    const jwt = require('jsonwebtoken');
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token: ' + error.message);
    }
  }

  // Hash password
  hashPassword(password) {
    const bcrypt = require('bcryptjs');
    return bcrypt.hashSync(password, config.BCRYPT_ROUNDS);
  }

  // Compare password
  comparePassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compareSync(password, hash);
  }
}

module.exports = new EncryptionUtils();

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const dbPath = path.resolve(config.DB_PATH);
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createLicensesTable = `
        CREATE TABLE IF NOT EXISTS licenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          license_key TEXT UNIQUE NOT NULL,
          machine_id TEXT,
          user_email TEXT,
          user_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          last_used DATETIME,
          usage_count INTEGER DEFAULT 0,
          notes TEXT
        )
      `;

      const createAdminUsersTable = `
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME
        )
      `;

      const createLicenseLogsTable = `
        CREATE TABLE IF NOT EXISTS license_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          license_key TEXT NOT NULL,
          action TEXT NOT NULL,
          machine_id TEXT,
          ip_address TEXT,
          user_agent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          details TEXT
        )
      `;

      this.db.serialize(() => {
        this.db.run(createLicensesTable);
        this.db.run(createAdminUsersTable);
        this.db.run(createLicenseLogsTable, (err) => {
          if (err) {
            console.error('Error creating tables:', err);
            reject(err);
          } else {
            console.log('✅ Database tables created successfully');
            this.createDefaultAdmin().then(resolve).catch(reject);
          }
        });
      });
    });
  }

  async createDefaultAdmin() {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(config.ADMIN_PASSWORD, config.BCRYPT_ROUNDS);
      
      const insertAdmin = `
        INSERT OR IGNORE INTO admin_users (username, password_hash)
        VALUES (?, ?)
      `;

      this.db.run(insertAdmin, [config.ADMIN_USERNAME, hashedPassword], function(err) {
        if (err) {
          console.error('Error creating default admin:', err);
          reject(err);
        } else {
          console.log('✅ Default admin user created');
          resolve();
        }
      });
    });
  }

  // License operations
  async createLicense(licenseData) {
    return new Promise((resolve, reject) => {
      const {
        license_key,
        user_email,
        user_name,
        expires_at,
        notes
      } = licenseData;

      const sql = `
        INSERT INTO licenses (license_key, user_email, user_name, expires_at, notes)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [license_key, user_email, user_name, expires_at, notes], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...licenseData });
        }
      });
    });
  }

  async validateLicense(licenseKey, machineId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM licenses 
        WHERE license_key = ? AND is_active = 1
      `;

      this.db.get(sql, [licenseKey], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve({ valid: false, reason: 'License not found or inactive' });
        } else if (new Date(row.expires_at) < new Date()) {
          resolve({ valid: false, reason: 'License expired' });
        } else if (row.machine_id && row.machine_id !== machineId) {
          resolve({ valid: false, reason: 'License already used on another machine' });
        } else {
          // Update usage info
          this.updateLicenseUsage(licenseKey, machineId);
          resolve({ valid: true, license: row });
        }
      });
    });
  }

  async updateLicenseUsage(licenseKey, machineId) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE licenses 
        SET machine_id = ?, last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1
        WHERE license_key = ?
      `;

      this.db.run(sql, [machineId, licenseKey], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getAllLicenses() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM licenses ORDER BY created_at DESC';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async revokeLicense(licenseKey) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE licenses SET is_active = 0 WHERE license_key = ?';
      
      this.db.run(sql, [licenseKey], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true, changes: this.changes });
        }
      });
    });
  }

  async getLicenseStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_licenses,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_licenses,
          COUNT(CASE WHEN is_active = 0 THEN 1 END) as revoked_licenses,
          COUNT(CASE WHEN expires_at < datetime('now') THEN 1 END) as expired_licenses,
          COUNT(CASE WHEN machine_id IS NOT NULL THEN 1 END) as used_licenses
        FROM licenses
      `;
      
      this.db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async logLicenseAction(licenseKey, action, machineId, ipAddress, userAgent, details) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO license_logs (license_key, action, machine_id, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [licenseKey, action, machineId, ipAddress, userAgent, details], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }

  async getAdminUser(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM admin_users WHERE username = ?';
      
      this.db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateAdminLastLogin(username) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE username = ?';
      
      this.db.run(sql, [username], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async getLicenseLogs(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM license_logs 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `;
      
      this.db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async updateLicense(licenseKey, updateData) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);
      values.push(licenseKey);
      
      const sql = `UPDATE licenses SET ${fields} WHERE license_key = ?`;
      
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async deleteLicense(licenseKey) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM licenses WHERE license_key = ?';
      
      this.db.run(sql, [licenseKey], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('✅ Database connection closed');
        }
      });
    }
  }
}

module.exports = new Database();

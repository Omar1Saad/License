const config = require('../config');

class Database {
  constructor() {
    this.db = null;
    this.dbType = process.env.DB_TYPE || 'sqlite'; // sqlite, postgresql, mysql
  }

  async init() {
    try {
      
      if (this.dbType === 'postgresql') {
        console.log('🐘 Initializing PostgreSQL...');
        await this.initPostgreSQL();
      } else if (this.dbType === 'mysql') {
        console.log('🐬 Initializing MySQL...');
        await this.initMySQL();
      } else {
        console.log('📁 Initializing SQLite...');
        await this.initSQLite();
      }
      
      await this.createTables();
      await this.createDefaultAdmin();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  async initSQLite() {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    
    let dbPath;
    if (process.env.NODE_ENV === 'production') {
      // في الإنتاج، استخدم مسار دائم
      dbPath = process.env.DB_PATH || '/app/data/licenses.db';
    } else {
      dbPath = path.resolve(config.DB_PATH);
    }
    
    // إنشاء المجلد إذا لم يكن موجوداً
    const dbDir = path.dirname(dbPath);
    if (!require('fs').existsSync(dbDir)) {
      require('fs').mkdirSync(dbDir, { recursive: true });
    }
    
    console.log('📁 SQLite Database path:', dbPath);
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async initPostgreSQL() {
    const { Pool } = require('pg');
    
    console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL);
    console.log('🔒 SSL Mode:', process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled');
    
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Test the connection
    try {
      const client = await this.db.connect();
      console.log('✅ PostgreSQL connection test successful');
      client.release();
    } catch (error) {
      console.error('❌ PostgreSQL connection test failed:', error);
      throw error;
    }
    
    console.log('✅ Connected to PostgreSQL database');
  }

  async initMySQL() {
    const mysql = require('mysql2/promise');
    
    this.db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'licenses',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('✅ Connected to MySQL database');
  }

  async createTables() {
    if (this.dbType === 'postgresql') {
      await this.createPostgreSQLTables();
    } else if (this.dbType === 'mysql') {
      await this.createMySQLTables();
    } else {
      await this.createSQLiteTables();
    }
  }

  async createSQLiteTables() {
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
            reject(err);
          } else {
            console.log('✅ SQLite tables created successfully');
            resolve();
          }
        });
      });
    });
  }

  async createPostgreSQLTables() {
    const createLicensesTable = `
      CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        license_key VARCHAR(255) UNIQUE NOT NULL,
        machine_id VARCHAR(255),
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_used TIMESTAMP,
        usage_count INTEGER DEFAULT 0,
        notes TEXT
      )
    `;

    const createAdminUsersTable = `
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `;

    const createLicenseLogsTable = `
      CREATE TABLE IF NOT EXISTS license_logs (
        id SERIAL PRIMARY KEY,
        license_key VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        machine_id VARCHAR(255),
        ip_address VARCHAR(255),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      )
    `;

    await this.db.query(createLicensesTable);
    await this.db.query(createAdminUsersTable);
    await this.db.query(createLicenseLogsTable);
    console.log('✅ PostgreSQL tables created successfully');
  }

  async createMySQLTables() {
    const createLicensesTable = `
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_key VARCHAR(255) UNIQUE NOT NULL,
        machine_id VARCHAR(255),
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_used TIMESTAMP,
        usage_count INT DEFAULT 0,
        notes TEXT
      )
    `;

    const createAdminUsersTable = `
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `;

    const createLicenseLogsTable = `
      CREATE TABLE IF NOT EXISTS license_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_key VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        machine_id VARCHAR(255),
        ip_address VARCHAR(255),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      )
    `;

    await this.db.execute(createLicensesTable);
    await this.db.execute(createAdminUsersTable);
    await this.db.execute(createLicenseLogsTable);
    console.log('✅ MySQL tables created successfully');
  }

  async createDefaultAdmin() {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(config.ADMIN_PASSWORD, config.BCRYPT_ROUNDS);
    
    if (this.dbType === 'postgresql') {
      await this.db.query(
        'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
        [config.ADMIN_USERNAME, hashedPassword]
      );
    } else if (this.dbType === 'mysql') {
      await this.db.execute(
        'INSERT IGNORE INTO admin_users (username, password_hash) VALUES (?, ?)',
        [config.ADMIN_USERNAME, hashedPassword]
      );
    } else {
      return new Promise((resolve, reject) => {
        const insertAdmin = `
          INSERT OR IGNORE INTO admin_users (username, password_hash)
          VALUES (?, ?)
        `;
        this.db.run(insertAdmin, [config.ADMIN_USERNAME, hashedPassword], function(err) {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Default admin user created');
            resolve();
          }
        });
      });
    }
    console.log('✅ Default admin user created');
  }

  // License operations
  async createLicense(licenseData) {
    const {
      license_key,
      user_email,
      user_name,
      expires_at,
      notes
    } = licenseData;

    if (this.dbType === 'postgresql') {
      const result = await this.db.query(
        'INSERT INTO licenses (license_key, user_email, user_name, expires_at, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [license_key, user_email, user_name, expires_at, notes]
      );
      return result.rows[0];
    } else if (this.dbType === 'mysql') {
      const [result] = await this.db.execute(
        'INSERT INTO licenses (license_key, user_email, user_name, expires_at, notes) VALUES (?, ?, ?, ?, ?)',
        [license_key, user_email, user_name, expires_at, notes]
      );
      return { id: result.insertId, ...licenseData };
    } else {
      return new Promise((resolve, reject) => {
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
  }

  async getAllLicenses() {
    if (this.dbType === 'postgresql') {
      const result = await this.db.query('SELECT * FROM licenses ORDER BY created_at DESC');
      return result.rows;
    } else if (this.dbType === 'mysql') {
      const [rows] = await this.db.execute('SELECT * FROM licenses ORDER BY created_at DESC');
      return rows;
    } else {
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
  }

  async validateLicense(licenseKey, machineId) {
    let row;
    
    if (this.dbType === 'postgresql') {
      const result = await this.db.query(
        'SELECT * FROM licenses WHERE license_key = $1 AND is_active = true',
        [licenseKey]
      );
      row = result.rows[0];
    } else if (this.dbType === 'mysql') {
      const [rows] = await this.db.execute(
        'SELECT * FROM licenses WHERE license_key = ? AND is_active = true',
        [licenseKey]
      );
      row = rows[0];
    } else {
      return new Promise((resolve, reject) => {
        const sql = `
          SELECT * FROM licenses 
          WHERE license_key = ? AND is_active = 1
        `;
        this.db.get(sql, [licenseKey], (err, result) => {
          if (err) {
            reject(err);
          } else {
            row = result;
            if (!row) {
              resolve({ valid: false, reason: 'License not found or inactive' });
            } else if (new Date(row.expires_at) < new Date()) {
              resolve({ valid: false, reason: 'License expired' });
            } else if (row.machine_id && row.machine_id !== machineId) {
              resolve({ valid: false, reason: 'License already used on another machine' });
            } else {
              this.updateLicenseUsage(licenseKey, machineId);
              resolve({ valid: true, license: row });
            }
          }
        });
      });
    }

    if (!row) {
      return { valid: false, reason: 'License not found or inactive' };
    } else if (new Date(row.expires_at) < new Date()) {
      return { valid: false, reason: 'License expired' };
    } else if (row.machine_id && row.machine_id !== machineId) {
      return { valid: false, reason: 'License already used on another machine' };
    } else {
      await this.updateLicenseUsage(licenseKey, machineId);
      return { valid: true, license: row };
    }
  }

  async updateLicenseUsage(licenseKey, machineId) {
    if (this.dbType === 'postgresql') {
      await this.db.query(
        'UPDATE licenses SET machine_id = $1, last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1 WHERE license_key = $2',
        [machineId, licenseKey]
      );
    } else if (this.dbType === 'mysql') {
      await this.db.execute(
        'UPDATE licenses SET machine_id = ?, last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1 WHERE license_key = ?',
        [machineId, licenseKey]
      );
    } else {
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
  }

  async getAdminUser(username) {
    let row;
    
    if (this.dbType === 'postgresql') {
      const result = await this.db.query('SELECT * FROM admin_users WHERE username = $1', [username]);
      row = result.rows[0];
    } else if (this.dbType === 'mysql') {
      const [rows] = await this.db.execute('SELECT * FROM admin_users WHERE username = ?', [username]);
      row = rows[0];
    } else {
      return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM admin_users WHERE username = ?';
        this.db.get(sql, [username], (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    }
    
    return row;
  }

  async getLicenseStats() {
    let stats;
    
    if (this.dbType === 'postgresql') {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_licenses,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_licenses,
          COUNT(CASE WHEN is_active = false THEN 1 END) as revoked_licenses,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_licenses,
          COUNT(CASE WHEN machine_id IS NOT NULL THEN 1 END) as used_licenses
        FROM licenses
      `);
      stats = result.rows[0];
    } else if (this.dbType === 'mysql') {
      const [rows] = await this.db.execute(`
        SELECT 
          COUNT(*) as total_licenses,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_licenses,
          COUNT(CASE WHEN is_active = false THEN 1 END) as revoked_licenses,
          COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_licenses,
          COUNT(CASE WHEN machine_id IS NOT NULL THEN 1 END) as used_licenses
        FROM licenses
      `);
      stats = rows[0];
    } else {
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
    
    return stats;
  }

  async logLicenseAction(licenseKey, action, machineId, ipAddress, userAgent, details) {
    if (this.dbType === 'postgresql') {
      const result = await this.db.query(
        'INSERT INTO license_logs (license_key, action, machine_id, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [licenseKey, action, machineId, ipAddress, userAgent, details]
      );
      return result.rows[0];
    } else if (this.dbType === 'mysql') {
      const [result] = await this.db.execute(
        'INSERT INTO license_logs (license_key, action, machine_id, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?, ?)',
        [licenseKey, action, machineId, ipAddress, userAgent, details]
      );
      return { id: result.insertId };
    } else {
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
  }

  async getLicenseLogs(limit = 100, offset = 0) {
    if (this.dbType === 'postgresql') {
      const result = await this.db.query(
        'SELECT * FROM license_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows;
    } else if (this.dbType === 'mysql') {
      const [rows] = await this.db.execute(
        'SELECT * FROM license_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      return rows;
    } else {
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
  }

  async revokeLicense(licenseKey) {
    if (this.dbType === 'postgresql') {
      const result = await this.db.query(
        'UPDATE licenses SET is_active = false WHERE license_key = $1',
        [licenseKey]
      );
      return { success: true, changes: result.rowCount };
    } else if (this.dbType === 'mysql') {
      const [result] = await this.db.execute(
        'UPDATE licenses SET is_active = false WHERE license_key = ?',
        [licenseKey]
      );
      return { success: true, changes: result.affectedRows };
    } else {
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
  }

  async updateLicense(licenseKey, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(licenseKey);
    
    if (this.dbType === 'postgresql') {
      const fieldNames = Object.keys(updateData).map((key, index) => `${key} = $${index + 1}`).join(', ');
      const query = `UPDATE licenses SET ${fieldNames} WHERE license_key = $${values.length}`;
      const result = await this.db.query(query, values);
      return { changes: result.rowCount };
    } else if (this.dbType === 'mysql') {
      const sql = `UPDATE licenses SET ${fields} WHERE license_key = ?`;
      const [result] = await this.db.execute(sql, values);
      return { changes: result.affectedRows };
    } else {
      return new Promise((resolve, reject) => {
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
  }

  async deleteLicense(licenseKey) {
    if (this.dbType === 'postgresql') {
      const result = await this.db.query('DELETE FROM licenses WHERE license_key = $1', [licenseKey]);
      return { changes: result.rowCount };
    } else if (this.dbType === 'mysql') {
      const [result] = await this.db.execute('DELETE FROM licenses WHERE license_key = ?', [licenseKey]);
      return { changes: result.affectedRows };
    } else {
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
  }

  async updateAdminLastLogin(username) {
    if (this.dbType === 'postgresql') {
      const result = await this.db.query(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE username = $1',
        [username]
      );
      return { changes: result.rowCount };
    } else if (this.dbType === 'mysql') {
      const [result] = await this.db.execute(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE username = ?',
        [username]
      );
      return { changes: result.affectedRows };
    } else {
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
  }

  close() {
    if (this.db) {
      if (this.dbType === 'postgresql') {
        this.db.end();
      } else if (this.dbType === 'mysql') {
        this.db.end();
      } else {
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
}

module.exports = new Database();

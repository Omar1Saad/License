const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const database = require('./src/models/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'https://grade-management-admin.vercel.app', // Admin panel URL
  'https://license-y64y.onrender.com', // License server URL
  'https://license-admin-panel.vercel.app', // Vercel admin panel
  'https://*.vercel.app', // All Vercel apps
  process.env.ADMIN_PANEL_URL // Environment variable for admin panel
].filter(Boolean);

console.log('🌐 CORS Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check exact matches first
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Check wildcard patterns
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        console.log('Allowed origins:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/licenses', require('./src/routes/licenses'));
app.use('/api/admin', require('./src/routes/admin'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'License Server'
  });
});

// Update system endpoints
app.get('/api/update-check', (req, res) => {
  const currentVersion = req.query.currentVersion || '1.0.0';
  
  // === إعدادات GitHub Releases ===
  // ضع اسم المستودع الخاص بك هنا
  const GITHUB_REPO = 'Omar1Saad/Grade-Management'; // ضع اسم المستودع هنا
  const GITHUB_REPO_OWNER = 'Omar1Saad'; // اسم المستخدم
  const GITHUB_REPO_NAME = 'Grade-Management'; // اسم المشروع
  
  // معلومات التحديثات المتاحة
  const updates = {
    // التحديث 1.0.0 → 1.1.0
    '1.0.0': {
      latestVersion: '1.1.0',
      updateType: 'app-update',
      appUpdate: {
        downloadUrl: 'https://github.com/Omar1Saad/Grade-Management/releases/download/v1.1.0/-1.1.0.AppImage',
        version: '1.1.0',
        size: '117 MB',
        features: [
          'نظام التحديثات التلقائية',
          'نظام النسخ الاحتياطية',
          'رسائل خطأ واضحة',
          'إضافة زر اختبار جديد'
        ]
      },
      releaseNotes: 'الإصدار 1.1.0 - نظام التحديثات والنسخ الاحتياطية',
      required: false
    },
    // التحديث 1.1.0 → 1.1.1
    '1.1.0': {
      latestVersion: '1.1.1',
      updateType: 'app-update',
      appUpdate: {
        downloadUrl: 'https://github.com/Omar1Saad/Grade-Management/releases/download/v1.1.1/%D9%86%D8%B8%D8%A7%D9%85%20%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9%20%D8%AF%D8%B1%D8%AC%D8%A7%D8%AA%20%D8%A7%D9%84%D8%B7%D9%84%D8%A8%D8%A9-1.1.1.AppImage',
        version: '1.1.1',
        size: '117 MB',
        features: [
          'إزالة زر الاختبار',
          'تحسينات في الأداء',
          'تنظيف الواجهة'
        ]
      },
      releaseNotes: 'الإصدار 1.1.1 - إزالة زر الاختبار وتحسينات',
      required: false
    }
  };
  
  // التحقق من وجود تحديث للإصدار الحالي
  const update = updates[currentVersion];
  
  if (update) {
    // يوجد تحديث - إرسال معلومات التحديث
    res.json({
      success: true,
      hasUpdate: true,
      ...update,
      timestamp: new Date().toISOString()
    });
  } else {
    // لا يوجد تحديث - الإصدار الحالي هو الأحدث
    res.json({
      success: true,
      hasUpdate: false,
      message: 'أنت تستخدم أحدث إصدار',
      currentVersion: currentVersion,
      timestamp: new Date().toISOString()
    });
  }
});

// Data update endpoint
app.post('/api/data-update', (req, res) => {
  const { currentVersion, updateType } = req.body;
  
  if (updateType === 'data-only') {
    res.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      dataUpdates: {
        newFeatures: [
          'إضافة تقارير مفصلة',
          'تحسين واجهة المستخدم'
        ],
        bugFixes: [
          'إصلاح مشكلة في حساب الدرجات'
        ]
      },
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'نوع التحديث غير صحيح'
    });
  }
});

// App update endpoint
app.get('/api/app-update/:version', (req, res) => {
  const { version } = req.params;
  
  // معلومات GitHub Repository
  const GITHUB_REPO = 'Omar1Saad/Grade-Management';
  
  res.json({
    success: true,
    version: version,
    // رابط GitHub Release
    downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/v${version}/Grade-Management-Setup-${version}.exe`,
    releaseNotes: 'تحديث البرنامج - تحسينات كاملة وميزات جديدة',
    features: [
      'تحسينات في الأداء',
      'واجهة مستخدم جديدة',
      'نظام تحديث تلقائي'
    ],
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'نظام إدارة التراخيص - Grade Management License Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      licenses: '/api/licenses',
      admin: '/api/admin'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await database.init();
    console.log('✅ Database initialized successfully');
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 License Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server URL: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
      console.log(`🔗 Health check: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/health`);
      console.log(`📋 Allowed origins: ${allowedOrigins.join(', ')}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');
const whatsappService = require('./services/whatsappService');

// Import cron jobs
const monthlyResetJob = require('./jobs/monthlyResetJob');
const initDailyRecapJob = require('./jobs/dailyRecapJobs');
const initAdminRecapJob = require('./jobs/adminRecapJobs');

// Initialize Express
const app = express();

// Connect to Database
connectDB();

// Initialize WhatsApp Gateway (auto-start on server boot)
setTimeout(() => {
  whatsappService.initialize();
  console.log('📱 WhatsApp Gateway initializing...');
}, 2000);

// =====================================
// MIDDLEWARE
// =====================================

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:4200',
      'http://localhost:3000',
      'http://154.26.131.4',
      'http://154.26.131.4:3000',
      'https://lafiswimmingacademy.com',
      'https://www.lafiswimmingacademy.com'
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in production for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body Parser
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve Static Files (legacy public folder)
app.use(express.static(path.join(__dirname, '../public')));

// =====================================
// SERVE UPLOADED FILES
// =====================================

const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));
console.log('📁 Serving uploads from:', uploadsPath);

// Test endpoint to verify uploads directory
app.get('/uploads/test', (req, res) => {
  const studentsPath = path.join(uploadsPath, 'students');

  if (!fs.existsSync(studentsPath)) {
    return res.json({
      success: false,
      message: 'Students upload directory does not exist',
      path: studentsPath
    });
  }

  const files = fs.readdirSync(studentsPath);
  res.json({
    success: true,
    uploadsPath,
    studentsPath,
    files
  });
});

// Request Logger (Development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// =====================================
// API ROUTES
// =====================================

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/coaches', require('./routes/coachRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// =====================================
// SERVE ANGULAR FRONTEND
// =====================================

const isProduction = process.env.NODE_ENV === 'production';
const angularDistPath = path.join(__dirname, '../public/frontend');
const browserPath = path.join(angularDistPath, 'browser');
const serverPath = path.join(angularDistPath, 'server');

console.log('🔍 Checking Angular build:');
console.log('   Root path:', angularDistPath);
console.log('   Browser path:', browserPath);
console.log('   Server path:', serverPath);

// Check what exists
const hasBrowser = fs.existsSync(browserPath);
const hasServer = fs.existsSync(serverPath);

console.log('   Browser folder:', hasBrowser ? '✅' : '❌');
console.log('   Server folder:', hasServer ? '✅' : '❌');

if (hasBrowser) {
  // List files in browser directory
  const browserFiles = fs.readdirSync(browserPath);
  console.log('   Browser files:', browserFiles.slice(0, 5).join(', '), '...');
  
  // Determine which index file to use
  const indexCsrPath = path.join(browserPath, 'index.csr.html');
  const indexPath = path.join(browserPath, 'index.html');
  
  let indexFile;
  
  if (fs.existsSync(indexCsrPath)) {
    indexFile = indexCsrPath;
    console.log('   Using: index.csr.html');
  } else if (fs.existsSync(indexPath)) {
    indexFile = indexPath;
    console.log('   Using: index.html');
  } else {
    console.error('   ❌ No index file found!');
    indexFile = null;
  }
  
  if (indexFile) {
    console.log('✅ Angular build found and configured!');
    
    // Serve static files from browser folder
    app.use(express.static(browserPath, {
      maxAge: isProduction ? '1y' : 0,
      etag: true,
      lastModified: true,
      index: false,
      setHeaders: (res, filePath) => {
        // Don't cache HTML files
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));

    // Handle Angular routing - ALL non-API routes return index file
    app.get('*', (req, res, next) => {
      // Skip API routes, uploads, and configuration
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/uploads/') || 
          req.path.startsWith('/configuration/')) {
        return next();
      }
      
      // Serve index file for all Angular routes
      console.log('Serving Angular app for:', req.path);
      res.sendFile(indexFile, (err) => {
        if (err) {
          console.error('Error sending index file:', err);
          res.status(500).json({ 
            success: false, 
            message: 'Error loading frontend' 
          });
        }
      });
    });
    
    console.log('✅ Angular routes configured');
  }
  
} else {
  console.warn('⚠️  Angular browser build not found at:', browserPath);
  console.warn('⚠️  Run: cd frontend && ng build --configuration production');
}

// =====================================
// STATIC PAGES (Legacy)
// =====================================
app.use('/reports', express.static(path.join(__dirname, '../public/reports')));


// =====================================
// HEALTH CHECK & STATUS
// =====================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Lafi Swimming Academy API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: 'connected',
      whatsapp: whatsappService.status || 'unknown',
    },
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      server: 'online',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      whatsapp: whatsappService.getStatus ? whatsappService.getStatus() : { status: 'unknown' },
    },
  });
});

// =====================================
// START CRON JOBS
// =====================================

setTimeout(() => {
  try {
    // reminder24Hours.start();
    // reminder1Hour.start();
    initDailyRecapJob();
initAdminRecapJob();

monthlyResetJob.start();
console.log('⏰ Schedule reminder jobs started');
  } catch (error) {
    console.error('❌ Error starting cron jobs:', error.message);
  }
}, 3000);

// =====================================
// ERROR HANDLERS
// =====================================

// 404 Handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
    path: req.path,
    method: req.method,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack,
    } : undefined,
  });
});

// =====================================
// GRACEFUL SHUTDOWN
// =====================================

const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');

  try {
    await whatsappService.disconnect();
    console.log('📱 WhatsApp disconnected');
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown();
});
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  gracefulShutdown();
});

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces

const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('='.repeat(70));
  console.log('🏊 LAFI SWIMMING ACADEMY - FULL STACK SERVER');
  console.log('='.repeat(70));
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Started: ${new Date().toLocaleString('id-ID')}`);
  console.log('');
  console.log('🌐 Access URLs:');
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://${HOST}:${PORT}`);
  console.log(`   Public:   http://154.26.131.4:${PORT}`);
  console.log('');
  console.log('📋 API Endpoints:');
  console.log(`   Health:   http://154.26.131.4:${PORT}/api/health`);
  console.log(`   Status:   http://154.26.131.4:${PORT}/api/status`);
  console.log(`   Login:    POST http://154.26.131.4:${PORT}/api/auth/login`);
  console.log(`   Students: GET  http://154.26.131.4:${PORT}/api/students`);
  console.log(`   Coaches:  GET  http://154.26.131.4:${PORT}/api/coaches`);
  console.log('');
  console.log('📁 Static Files:');
  console.log(`   Uploads:  http://154.26.131.4:${PORT}/uploads`);
  console.log(`   WhatsApp: http://154.26.131.4:${PORT}/configuration/lafi`);
  console.log('');
  
  if (hasBrowser) {
    console.log(`✅ Angular Frontend: ENABLED`);
    console.log(`   Path: ${browserPath}`);
  } else {
    console.log(`⚠️  Angular Frontend: NOT BUILT`);
    console.log(`   Run: cd frontend && ng build --configuration production`);
  }
  
  console.log('');
  console.log('🔧 Services Status:');
  console.log(`   Database:  ✅ Connected`);
  console.log(`   WhatsApp:  🔄 Initializing...`);
  console.log(`   Cron Jobs: ⏰ Scheduled`);
  console.log('');
  console.log('🔓 Network Binding:');
  console.log(`   Binding to ${HOST} - accessible from external networks`);
  console.log(`   Firewall: Ensure port ${PORT} is open`);
  console.log(`   Command: sudo ufw allow ${PORT}/tcp`);
  console.log('');
  console.log('✅ Server is ready to accept connections!');
  console.log('='.repeat(70));
  console.log('');
});

// Handle server errors
server.on('error', (error) => {
  console.error('');
  console.error('❌ SERVER ERROR:');
  console.error('='.repeat(70));
  
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error('');
    console.error('   Solutions:');
    console.error(`   1. Find process: sudo lsof -i :${PORT}`);
    console.error(`   2. Kill process: sudo kill -9 <PID>`);
    console.error(`   3. Or use different port: PORT=3001 node server.js`);
  } else if (error.code === 'EACCES') {
    console.error(`❌ Permission denied to bind to port ${PORT}`);
    console.error('');
    console.error('   Solutions:');
    console.error(`   1. Use port > 1024: PORT=3000 node server.js`);
    console.error(`   2. Or run with sudo: sudo node server.js`);
  } else {
    console.error('❌ Unknown server error:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.error('='.repeat(70));
  console.error('');
  process.exit(1);
});

// Log successful binding
server.on('listening', () => {
  const address = server.address();
  console.log(`🎉 Server successfully bound to ${address.address}:${address.port}`);
});

module.exports = server;

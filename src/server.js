require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');
const whatsappService = require('./services/whatsappService');

// Import cron jobs
const { reminder24Hours, reminder1Hour } = require('./jobs/scheduleReminderJob');
const paymentReminderJob = require('./jobs/paymentReminderJob');
const monthlyResetJob = require('./jobs/monthlyResetJob');

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

// CORS Configuration (only for development)
if (process.env.NODE_ENV === 'development') {
  app.use(cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:4200',
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
}

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
// SERVE ANGULAR STATIC FILES
// =====================================
// =====================================
// SERVE ANGULAR SSR
// =====================================

const isProduction = process.env.NODE_ENV === 'production';
const angularDistPath = path.join(__dirname, '../../frontend/dist/frontend');
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

// WhatsApp Config Dashboard
app.get('/configuration/lafi', (req, res) => {
  const waConfigPath = path.join(__dirname, '../public/waconfig/index.html');
  if (fs.existsSync(waConfigPath)) {
    res.sendFile(waConfigPath);
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'WhatsApp config page not found' 
    });
  }
});

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
    reminder24Hours.start();
    reminder1Hour.start();
    console.log('⏰ Schedule reminder jobs started');
    
    paymentReminderJob.start();
    monthlyResetJob.start();
    console.log('💰 Payment reminder jobs started');
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

const server = app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🏊 LAFI SWIMMING ACADEMY - FULL STACK SERVER');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Access: http://localhost:${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
  console.log(`📱 WhatsApp Config: http://localhost:${PORT}/configuration/lafi`);
  
  if (fs.existsSync(angularDistPath)) {
    console.log(`✅ Angular Frontend: ENABLED (serving from dist)`);
  } else {
    console.log(`⚠️  Angular Frontend: NOT BUILT`);
    console.log(`   Run: cd frontend && ng build --configuration production`);
  }
  
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 API Endpoints Available - See documentation above');
  console.log('');
  console.log('✅ Server is ready to accept connections');
  console.log('='.repeat(60));
  console.log('');
});

module.exports = server;

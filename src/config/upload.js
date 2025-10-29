const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define upload directories
const studentUploadDir = path.join(__dirname, '../../uploads/students');
const coachUploadDir = path.join(__dirname, '../../uploads/coaches');
const newsUploadDir = path.join(__dirname, '../../uploads/news');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('✅ Upload directory created:', dir);
  }
};

// Create directories
ensureDirectoryExists(studentUploadDir);
ensureDirectoryExists(coachUploadDir);
ensureDirectoryExists(newsUploadDir);

// Storage configuration for students
const studentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, studentUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `student-${uniqueSuffix}${ext}`);
  }
});

// Storage configuration for coaches
const coachStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, coachUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `coach-${uniqueSuffix}${ext}`);
  }
});

// Storage configuration for news
const newsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, newsUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `news-${uniqueSuffix}${ext}`);
  }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Multer configuration for students
const uploadStudent = multer({
  storage: studentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// Multer configuration for coaches
const uploadCoach = multer({
  storage: coachStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// Multer configuration for news
const uploadNews = multer({
  storage: newsStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// Export all upload configurations
module.exports = {
  uploadStudent,
  uploadCoach,
  uploadNews
};

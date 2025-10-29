const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
  coachId: {
    type: String,
    required: [true, 'Coach ID is required'],
    unique: true,
    trim: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Laki-laki', 'Perempuan']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  photo: {
    type: String,
    default: null
  },
  specialization: {
    type: [String],
    default: []
  },
  certification: {
    type: [String],
    default: []
  },
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: 0,
    default: 0
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Aktif', 'Non-Aktif', 'Cuti'],
    default: 'Aktif'
  },
  joinDate: {
    type: Date,
    required: [true, 'Join date is required'],
    default: Date.now
  },
  salary: {
    type: Number,
    min: 0,
    default: null
  },
  emergencyContact: {
    type: String,
    required: [true, 'Emergency contact is required'],
    trim: true
  },
  emergencyPhone: {
    type: String,
    required: [true, 'Emergency phone is required'],
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    default: ''
  },
  achievements: {
    type: [String],
    default: []
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: null
  },
  totalStudents: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
coachSchema.index({ coachId: 1 });
coachSchema.index({ email: 1 });
coachSchema.index({ status: 1 });
coachSchema.index({ fullName: 'text' });

module.exports = mongoose.model('Coach', coachSchema);

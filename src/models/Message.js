const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true,
  },
  recipientName: {
    type: String,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['notification', 'reminder', 'broadcast', 'manual',   'report',],
    default: 'manual',
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered', 'read'],
    default: 'pending',
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  sentByName: {
    type: String,
  },
  error: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  sentAt: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
  readAt: {
    type: Date,
  },
  // ==================== TTL FIELD ====================
  // Field untuk auto-delete setelah 24 jam
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 jam dari sekarang
    index: { expires: 0 } // TTL Index - hapus saat expireAt tercapai
  }
}, {
  timestamps: true,
});

// ==================== INDEXES ====================

// Index for faster queries
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ status: 1, createdAt: -1 });
messageSchema.index({ sentBy: 1, createdAt: -1 });

// TTL Index - MongoDB akan otomatis menghapus dokumen setelah expireAt tercapai
messageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// ==================== PRE-SAVE HOOK ====================

// Update expireAt jika perlu perpanjangan waktu
messageSchema.pre('save', function(next) {
  // Jika dokumen baru dan expireAt belum diset
  if (this.isNew && !this.expireAt) {
    this.expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  next();
});

// ==================== INSTANCE METHODS ====================

// Method untuk memperpanjang masa hidup dokumen
messageSchema.methods.extendExpiry = function(hours = 24) {
  this.expireAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.save();
};

// Method untuk set expiry custom
messageSchema.methods.setExpiry = function(expiryDate) {
  this.expireAt = expiryDate;
  return this.save();
};

// ==================== STATIC METHODS ====================

// Get messages yang akan expire dalam X jam
messageSchema.statics.getExpiringSoon = async function(hours = 1) {
  const expiryThreshold = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.find({
    expireAt: { $lte: expiryThreshold }
  }).sort({ expireAt: 1 });
};

module.exports = mongoose.model('Message', messageSchema);

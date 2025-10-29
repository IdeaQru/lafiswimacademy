const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  newsId: {
    type: String,
    required: [true, 'News ID is required'],
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  coverImage: {
    type: String,
    default: null
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Berita', 'Pengumuman', 'Event', 'Artikel', 'Tips'],
    default: 'Berita'
  },
  tags: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft'
  },
  publishDate: {
    type: Date,
    required: [true, 'Publish date is required'],
    default: Date.now
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  metaDescription: {
    type: String,
    trim: true,
    default: ''
  },
  metaKeywords: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Indexes for better query performance
newsSchema.index({ newsId: 1 });
newsSchema.index({ slug: 1 });
newsSchema.index({ status: 1 });
newsSchema.index({ category: 1 });
newsSchema.index({ publishDate: -1 });
newsSchema.index({ featured: 1 });
newsSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

// Virtual for URL
newsSchema.virtual('url').get(function() {
  return `/news/${this.slug}`;
});

module.exports = mongoose.model('News', newsSchema);

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const textAreaSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  defaultText: { type: String, default: '' },
  color: { type: String, default: '#000000' },
  fontSize: { type: Number, default: 24 },
  fontFamily: { type: String, default: 'Impact' },
  textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
  strokeColor: { type: String, default: '#ffffff' },
  strokeWidth: { type: Number, default: 2 }
}, { _id: false });

const templateSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  imageUrl: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  publicId: {
    type: String,
    required: true
  },
  thumbnailUrl: { 
    type: String,
    validate: {
      validator: function(v) {
        return v ? /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v) : true;
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  width: { 
    type: Number, 
    required: true,
    min: 100,
    max: 5000
  },
  height: { 
    type: Number, 
    required: true,
    min: 100,
    max: 5000
  },
  category: { 
    type: String, 
    required: true,
    enum: [
      'Funny',
      'Animals',
      'Movies',
      'TV Shows',
      'Celebrities',
      'Gaming',
      'Anime',
      'Politics',
      'Other'
    ],
    default: 'Funny'
  },
  tags: { 
    type: [String], 
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 10;
      },
      message: props => `Tags array exceeds the limit of 10!`
    }
  },
  textAreas: {
    type: [textAreaSchema],
    default: []
  },
  popularity: { 
    type: Number, 
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'archived'],
    default: 'pending'
  },
  views: {
    type: Number,
    default: 0
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

// Add pagination plugin
templateSchema.plugin(mongoosePaginate);

// Indexes for better performance
templateSchema.index({ name: 'text' });
templateSchema.index({ category: 1 });
templateSchema.index({ popularity: -1 });
templateSchema.index({ createdAt: -1 });
templateSchema.index({ user: 1 });
templateSchema.index({ status: 1 });

// Virtual for formatted date
templateSchema.virtual('createdAtFormatted').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for user info
templateSchema.virtual('creator', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
  options: { select: 'username avatarUrl' }
});

// Middleware to update updatedAt field
templateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Ensure tags are unique and trimmed
  if (this.tags && this.isModified('tags')) {
    this.tags = [...new Set(this.tags.map(tag => tag.trim()))];
  }
  
  next();
});

// Static method to increment usage count
templateSchema.statics.incrementUsage = async function(templateId) {
  return this.findByIdAndUpdate(
    templateId,
    { $inc: { usageCount: 1 } },
    { new: true }
  );
};

// Static method to increment views
templateSchema.statics.incrementViews = async function(templateId) {
  return this.findByIdAndUpdate(
    templateId,
    { $inc: { views: 1 } },
    { new: true }
  );
};

// Query helper to filter by active status
templateSchema.query.active = function() {
  return this.where({ status: 'active' });
};

// Query helper to sort by popularity
templateSchema.query.popular = function() {
  return this.sort({ popularity: -1 });
};

// Query helper to filter by category
templateSchema.query.byCategory = function(category) {
  return this.where({ category });
};

// Instance method to get basic info
templateSchema.methods.getBasicInfo = function() {
  return {
    id: this._id,
    name: this.name,
    imageUrl: this.imageUrl,
    thumbnailUrl: this.thumbnailUrl,
    category: this.category,
    popularity: this.popularity,
    views: this.views,
    usageCount: this.usageCount,
    createdAt: this.createdAtFormatted
  };
};

// Instance method to get detailed info
templateSchema.methods.getDetailedInfo = function() {
  return {
    ...this.getBasicInfo(),
    width: this.width,
    height: this.height,
    tags: this.tags,
    textAreas: this.textAreas,
    creator: this.creator,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Template', templateSchema);
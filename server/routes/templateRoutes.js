const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Template = require('../models/Template');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const { logActivity } = require('../utils/logger');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validateMemeCreation } = require('../validators/memeValidator');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configure multer for file uploads with enhanced validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/templates');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype)) {
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file extension. Allowed: ${allowedExts.join(', ')}`));
    }
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`));
  }
};

const upload = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1
  },
  fileFilter
});

// Middleware to clean up uploaded files on error
const cleanupUploads = (req, res, next) => {
  res.on('finish', () => {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error cleaning up file:', err);
      });
    }
  });
  next();
};

// GET template preview for homepage
router.get(
  '/preview',
  rateLimiter(30, 60), // 30 requests per minute
  async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const templates = await Template.find({ status: 'active' })
        .sort({ popularity: -1, createdAt: -1 })
        .limit(limit)
        .select('name imageUrl category width height tags')
        .lean();

      logActivity('Fetched preview templates', {
        count: templates.length,
        limit,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        templates: templates.map(t => ({
          ...t,
          imageUrl: t.imageUrl || 'https://via.placeholder.com/300x300?text=Template+Image',
          tags: t.tags || []
        }))
      });
    } catch (error) {
      console.error('Preview templates error:', error);
      logActivity('Preview templates error', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch preview templates',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET all templates with pagination and filtering
router.get('/', 
  rateLimiter(30, 60),
  async (req, res) => {
    try {
      const { 
        search = '', 
        category = '', 
        page = 1, 
        limit = 20,
        sort = 'newest'
      } = req.query;
      
      // Validate and sanitize inputs
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      
      const query = { status: 'active' };
      if (search) query.name = { $regex: search.trim(), $options: 'i' };
      if (category && ['Funny', 'Animals', 'Movies', 'TV Shows', 'Celebrities', 'Gaming', 'Anime', 'Politics', 'Other'].includes(category)) {
        query.category = category;
      }

      const sortOptions = {
        newest: { createdAt: -1 },
        popular: { popularity: -1 },
        oldest: { createdAt: 1 }
      };
      const sortBy = sortOptions[sort] || sortOptions.newest;

      const options = {
        page: pageNum,
        limit: limitNum,
        sort: sortBy,
        collation: { locale: 'en', strength: 2 } // Case-insensitive sorting
      };

      const templates = await Template.paginate(query, options);

      res.json({
        success: true,
        templates: templates.docs,
        currentPage: templates.page,
        totalPages: templates.totalPages,
        totalTemplates: templates.totalDocs
      });
    } catch (err) {
      console.error('Fetch templates error:', err);
      logActivity('Fetch templates error', {
        error: err.message,
        query: req.query,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ 
        success: false,
        message: 'Server error while fetching templates',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
);

// POST upload new template
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  upload.single('image'),
  cleanupUploads,
  validateMemeCreation,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: 'No image file uploaded or file validation failed',
          errors: req.fileValidationError ? [req.fileValidationError] : []
        });
      }

      // Verify the file exists and is readable
      try {
        await fs.promises.access(req.file.path, fs.constants.R_OK);
      } catch (err) {
        return res.status(400).json({ 
          success: false,
          message: 'Uploaded file is not accessible'
        });
      }

      // Upload to Cloudinary with error handling
      let result;
      try {
        result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'meme-templates',
          quality: 'auto',
          fetch_format: 'auto',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' }
          ]
        });
      } catch (cloudinaryErr) {
        console.error('Cloudinary upload error:', cloudinaryErr);
        return res.status(500).json({ 
          success: false,
          message: 'Failed to process image upload'
        });
      }

      // Process tags
      const tags = req.body.tags 
        ? req.body.tags.split(',').map(tag => tag.trim()).filter(t => t.length > 0)
        : [];

      const template = new Template({
        user: req.user._id,
        name: req.body.name.trim(),
        imageUrl: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        category: req.body.category,
        tags,
        status: 'pending' // Could add admin approval workflow
      });

      await template.save();

      // Update user's upload count
      await User.findByIdAndUpdate(req.user._id, { 
        $inc: { templateUploads: 1 } 
      });

      logActivity('Template uploaded', {
        userId: req.user._id,
        templateId: template._id,
        category: template.category,
        tagsCount: tags.length,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        template: {
          _id: template._id,
          name: template.name,
          imageUrl: template.imageUrl,
          category: template.category,
          tags: template.tags,
          createdAt: template.createdAt
        }
      });
    } catch (err) {
      console.error('Template upload error:', err);
      logActivity('Template upload failed', {
        userId: req.user?._id,
        error: err.message,
        file: req.file?.originalname,
        timestamp: new Date().toISOString()
      });
      
      // If we have a Cloudinary ID but failed to save, try to clean up
      if (result?.public_id) {
        try {
          await cloudinary.uploader.destroy(result.public_id);
        } catch (cleanupErr) {
          console.error('Failed to cleanup Cloudinary upload:', cleanupErr);
        }
      }

      res.status(500).json({ 
        success: false,
        message: 'Server error during upload',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
);

// POST toggle favorite template
router.post(
  '/:id/favorite', 
  passport.authenticate('jwt', { session: false }),
  rateLimiter(15, 60), // 15 requests per minute
  async (req, res) => {
    try {
      const templateId = req.params.id;
      
      // Validate template exists
      const templateExists = await Template.exists({ 
        _id: templateId, 
        status: 'active' 
      });
      
      if (!templateExists) {
        return res.status(404).json({ 
          success: false,
          message: 'Template not found or not available' 
        });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      const index = user.favoriteTemplates.indexOf(templateId);
      if (index === -1) {
        user.favoriteTemplates.push(templateId);
        // Increment template popularity
        await Template.findByIdAndUpdate(templateId, { 
          $inc: { popularity: 1 } 
        });
      } else {
        user.favoriteTemplates.splice(index, 1);
        // Decrement template popularity
        await Template.findByIdAndUpdate(templateId, { 
          $inc: { popularity: -1 } 
        });
      }

      await user.save();

      logActivity('Template favorite toggled', {
        userId: user._id,
        templateId,
        action: index === -1 ? 'added' : 'removed',
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        action: index === -1 ? 'added' : 'removed',
        favoriteTemplates: user.favoriteTemplates
      });
    } catch (err) {
      console.error('Favorite toggle error:', err);
      logActivity('Favorite toggle failed', {
        userId: req.user?._id,
        templateId: req.params?.id,
        error: err.message,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ 
        success: false,
        message: 'Server error while toggling favorite',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
);

module.exports = router;
const express = require('express');
const router = express.Router();
const passport = require('passport');
const Meme = require('../models/Meme');
const Template = require('../models/Template');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validateMemeCreation } = require('../validators/memeValidator');
const { logActivity } = require('../utils/logger');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');

// Create meme with enhanced validation and image processing
router.post(
  '/',
  rateLimiter(10, 60), // 10 requests per minute
  passport.authenticate('jwt', { session: false }),
  validateMemeCreation,
  async (req, res) => {
    try {
      const { templateId, texts, styles, customImage } = req.body;
      
      // Get template with caching
      const template = await Template.findById(templateId).cache(60); // Cache for 60 seconds
      if (!template) {
        return res.status(404).json({ 
          success: false,
          message: 'Template not found' 
        });
      }

      // Handle custom image upload if provided
      let processedImageUrl = template.imageUrl;
      let publicId = null;
      if (customImage) {
        const uploadResult = await uploadToCloudinary(customImage, 'memes');
        processedImageUrl = uploadResult.url;
        publicId = uploadResult.publicId;
      }

      // Create meme with additional metadata
      const meme = new Meme({
        user: req.user._id,
        template: templateId,
        texts,
        styles,
        imageUrl: processedImageUrl,
        publicId,
        originalTemplate: template._id,
        dimensions: {
          width: template.width,
          height: template.height
        }
      });

      await meme.save();
      
      // Increment template usage count
      await Template.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } });

      logActivity('Meme created', {
        userId: req.user._id,
        memeId: meme._id,
        templateId
      });

      res.status(201).json({
        success: true,
        meme: {
          id: meme._id,
          imageUrl: meme.imageUrl,
          createdAt: meme.createdAt
        }
      });

    } catch (error) {
      logActivity('Meme creation failed', {
        error: error.message,
        userId: req.user?._id,
        templateId: req.body?.templateId
      });
      
      res.status(500).json({ 
        success: false,
        message: 'Failed to create meme',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get user memes with pagination and filtering
router.get(
  '/my-memes',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      // Validate and parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
      const skip = (page - 1) * limit;

      // Add caching key for user-specific memes
      const cacheKey = `user:${req.user._id}:memes:page:${page}:limit:${limit}`;

      // Check if cached data exists
      if (typeof Meme.find().cache === 'function') {
        const cachedData = await mongoose.cache.get(cacheKey);
        if (cachedData) {
          return res.json(JSON.parse(cachedData));
        }
      }

      // Execute parallel queries for memes and count
      const [memes, total] = await Promise.all([
        Meme.find({ user: req.user._id })
          .select('imageUrl likesCount commentsCount createdAt texts styles')
          .sort('-createdAt')
          .skip(skip)
          .limit(limit)
          .populate('template', 'name category imageUrl width height')
          .lean(), // Convert to plain JS objects
        Meme.countDocuments({ user: req.user._id })
      ]);

      // Format response data
      const response = {
        success: true,
        memes: memes.map(meme => ({
          ...meme,
          createdAt: meme.createdAt.toISOString(),
          template: {
            ...meme.template,
            imageUrl: meme.template?.imageUrl || '/default-template.png'
          }
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalMemes: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      };

      // Cache the response if caching is available
      if (typeof Meme.find().cache === 'function') {
        await mongoose.cache.set(cacheKey, JSON.stringify(response), 300); // Cache for 5 minutes
      }

      res.json(response);

    } catch (error) {
      console.error('Error fetching user memes:', {
        userId: req.user._id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      logActivity('Failed to fetch user memes', {
        userId: req.user._id,
        error: error.message,
        stack: error.stack,
        queryParams: req.query,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch your memes',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }
);

// Get popular memes with caching
router.get(
  '/popular',
  rateLimiter(30, 60), // 30 requests per minute
  async (req, res) => {
    try {
      // Check if caching is available
      const hasCache = typeof Meme.find().cache === 'function';
      
      let query = Meme.find()
        .sort('-likesCount -createdAt')
        .limit(20)
        .populate('template', 'name category imageUrl')
        .populate('user', 'username avatar');

      // Only apply cache if the function exists
      if (hasCache) {
        query = query.cache(300); // Cache for 5 minutes
      }

      const memes = await query;

      res.json({
        success: true,
        memes: memes.map(meme => ({
          id: meme._id,
          imageUrl: meme.imageUrl,
          likesCount: meme.likesCount,
          commentsCount: meme.comments?.length || 0,
          template: {
            id: meme.template?._id,
            name: meme.template?.name,
            category: meme.template?.category,
            imageUrl: meme.template?.imageUrl
          },
          user: {
            id: meme.user?._id,
            username: meme.user?.username,
            avatar: meme.user?.avatar
          },
          createdAt: meme.createdAt?.toISOString()
        }))
      });

    } catch (error) {
      console.error('Popular memes fetch error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      logActivity('Failed to fetch popular memes', { 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch popular memes',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }
);

// Like/unlike meme with validation
router.post(
  '/:id/like',
  rateLimiter(15, 60), // 15 requests per minute
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const meme = await Meme.findById(req.params.id);
      if (!meme) {
        return res.status(404).json({ 
          success: false,
          message: 'Meme not found' 
        });
      }

      const userId = req.user._id;
      const likeIndex = meme.likes.indexOf(userId);

      if (likeIndex === -1) {
        // Like the meme
        meme.likes.push(userId);
        meme.likesCount += 1;
        
        await meme.save();
        
        logActivity('Meme liked', {
          userId,
          memeId: meme._id
        });

        res.json({
          success: true,
          action: 'liked',
          likesCount: meme.likesCount
        });
      } else {
        // Unlike the meme
        meme.likes.splice(likeIndex, 1);
        meme.likesCount -= 1;
        
        await meme.save();
        
        logActivity('Meme unliked', {
          userId,
          memeId: meme._id
        });

        res.json({
          success: true,
          action: 'unliked',
          likesCount: meme.likesCount
        });
      }

    } catch (error) {
      logActivity('Meme like failed', {
        error: error.message,
        userId: req.user?._id,
        memeId: req.params?.id
      });
      
      res.status(500).json({ 
        success: false,
        message: 'Failed to process like'
      });
    }
  }
);

// Delete meme with proper cleanup
router.delete(
  '/:id',
  rateLimiter(5, 60), // 5 requests per minute
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const meme = await Meme.findById(req.params.id);
      
      // Check if meme exists
      if (!meme) {
        return res.status(404).json({ 
          success: false,
          message: 'Meme not found' 
        });
      }

      // Verify ownership
      if (meme.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized to delete this meme' 
        });
      }

      // Delete from Cloudinary if custom image was uploaded
      if (meme.publicId) {
        await deleteFromCloudinary(meme.publicId);
      }

      // Delete from database
      await Meme.findByIdAndDelete(req.params.id);

      logActivity('Meme deleted', {
        userId: req.user._id,
        memeId: meme._id
      });

      res.json({ 
        success: true,
        message: 'Meme deleted successfully' 
      });

    } catch (error) {
      console.error('Delete meme error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id,
        memeId: req.params?.id,
        timestamp: new Date().toISOString()
      });

      logActivity('Meme deletion failed', {
        error: error.message,
        userId: req.user?._id,
        memeId: req.params?.id,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({ 
        success: false,
        message: 'Failed to delete meme',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { cloudinary } = require('../services/cloudinaryService');
const { logActivity } = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    logActivity('User registered', {
      userId: user._id,
      email: user.email
    });

    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        avatar: user.avatar 
      } 
    });
  } catch (err) {
    logActivity('Registration failed', {
      error: err.message,
      email: req.body?.email
    });
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    logActivity('User logged in', {
      userId: user._id,
      email: user.email
    });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        avatar: user.avatar,
        bio: user.bio
      } 
    });
  } catch (err) {
    logActivity('Login failed', {
      error: err.message,
      email: req.body?.email
    });
    res.status(500).json({ message: 'Server error' });
  }
});

// Current user
router.get('/me', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    logActivity('Failed to fetch user', {
      userId: req.user?._id,
      error: err.message
    });
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put(
  '/update-profile',
  passport.authenticate('jwt', { session: false }),
  upload.single('avatar'),
  async (req, res) => {
    try {
      const { username, bio } = req.body;
      const updates = {};

      // Validate username
      if (username) {
        if (username.length < 3 || username.length > 30) {
          return res.status(400).json({ message: 'Username must be between 3-30 characters' });
        }
        updates.username = username;
      }

      // Validate bio
      if (bio !== undefined) {
        if (bio.length > 200) {
          return res.status(400).json({ message: 'Bio must be less than 200 characters' });
        }
        updates.bio = bio;
      }

      // Handle avatar upload
      if (req.file) {
        try {
          // Delete old avatar from Cloudinary if exists
          if (req.user.avatarPublicId) {
            await cloudinary.uploader.destroy(req.user.avatarPublicId);
          }

          // Upload new avatar
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'meme-app/avatars',
            width: 200,
            height: 200,
            crop: 'fill'
          });

          updates.avatar = result.secure_url;
          updates.avatarPublicId = result.public_id;

          // Remove temp file
          fs.unlinkSync(req.file.path);
        } catch (uploadErr) {
          // Clean up temp file if upload failed
          if (req.file?.path) {
            fs.unlinkSync(req.file.path);
          }
          throw uploadErr;
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      logActivity('Profile updated', {
        userId: req.user._id,
        updatedFields: Object.keys(updates)
      });

      res.json(updatedUser);
    } catch (err) {
      logActivity('Profile update failed', {
        userId: req.user?._id,
        error: err.message
      });
      
      res.status(500).json({ 
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
);

module.exports = router;
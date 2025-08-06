const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/', passport.authenticate('jwt', { session: false }), upload.single('avatar'), async (req, res) => {
  try {
    const { username, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (username) user.username = username;
    if (bio) user.bio = bio;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'user-avatars',
      });
      user.avatar = result.secure_url;
    }

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
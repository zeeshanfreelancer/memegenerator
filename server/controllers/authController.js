const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1) Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email already in use'
      });
    }

    // 2) Create new user
    const newUser = await User.create({
      name,
      email,
      password
    });

    // 3) Generate JWT token
    const token = signToken(newUser._id);

    // 4) Remove password from output
    newUser.password = undefined;

    // 5) Send response
    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message || 'Registration failed'
    });
  }
};
const { body } = require('express-validator');
const Template = require('../models/Template');

exports.validateMemeCreation = [
  // Validate templateId exists and is valid
  body('templateId')
    .notEmpty().withMessage('Template ID is required')
    .isMongoId().withMessage('Invalid template ID format')
    .custom(async (value) => {
      const template = await Template.findById(value);
      if (!template) {
        throw new Error('Template not found');
      }
      return true;
    }),

  // Validate texts array
  body('texts')
    .isArray({ min: 1 }).withMessage('At least one text element is required')
    .custom((texts) => {
      if (texts.some(text => typeof text !== 'string')) {
        throw new Error('All text elements must be strings');
      }
      return true;
    }),

  // Validate styles object
  body('styles')
    .optional()
    .isObject().withMessage('Styles must be an object'),

  // Validate custom image (if provided)
  body('customImage')
    .optional()
    .isString().withMessage('Custom image must be a base64 string')
    .custom((value) => {
      if (!value.startsWith('data:image/')) {
        throw new Error('Invalid image format. Must be base64 encoded image');
      }
      return true;
    })
];

exports.validateLikeAction = [
  body('action')
    .optional()
    .isIn(['like', 'unlike']).withMessage('Action must be either "like" or "unlike"')
];
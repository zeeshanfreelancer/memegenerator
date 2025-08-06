const axios = require('axios');
const Template = require('../models/Template');
const { logError } = require('../utils/logger');
const { rateLimiter } = require('../middleware/rateLimiter');

// Cache variables
let templateCache = {
  lastUpdated: null,
  data: null,
  expiresIn: 15 * 60 * 1000 // 15 minutes cache
};

// GET /api/templates?page=1&limit=20&search=query&category=category
exports.getTemplates = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const { search, category } = req.query;
    const skip = (page - 1) * limit;

    // Check cache first
    if (templateCache.data && templateCache.lastUpdated && 
        (Date.now() - templateCache.lastUpdated) < templateCache.expiresIn) {
      return res.json(paginateResults(templateCache.data, page, limit));
    }

    // Check if database needs seeding
    const shouldSeed = await checkDatabaseSeed();
    if (shouldSeed) {
      await seedTemplatesFromImgFlip();
    }

    // Build query
    const query = buildTemplateQuery(search, category);
    
    // Get templates with optimized query
    const [templates, total] = await Promise.all([
      Template.find(query)
        .select('templateId name url width height category createdAt')
        .sort({ popularity: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Template.countDocuments(query)
    ]);

    // Update cache
    templateCache = {
      lastUpdated: Date.now(),
      data: await Template.find(query).lean(),
      expiresIn: 15 * 60 * 1000
    };

    res.json({
      success: true,
      templates,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTemplates: total,
        limit
      }
    });

  } catch (error) {
    logError('Failed to fetch templates', error, { endpoint: 'GET /api/templates' });
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch templates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper Functions

async function checkDatabaseSeed() {
  const count = await Template.countDocuments();
  return count === 0;
}

async function seedTemplatesFromImgFlip() {
  try {
    const response = await axios.get('https://api.imgflip.com/get_memes', {
      timeout: 5000 // 5 second timeout
    });
    
    const templates = response.data.data.memes.map(meme => ({
      templateId: meme.id,
      name: meme.name,
      url: meme.url,
      width: meme.width,
      height: meme.height,
      category: 'popular', // Default category
      boxCount: meme.box_count,
      popularity: Math.floor(Math.random() * 1000) // Initial random popularity
    }));

    await Template.insertMany(templates);
    console.log(`Seeded ${templates.length} templates from ImgFlip`);
  } catch (error) {
    logError('Failed to seed templates from ImgFlip', error);
    throw new Error('Template seeding failed');
  }
}

function buildTemplateQuery(search, category) {
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (category) {
    query.category = category.toLowerCase();
  }

  return query;
}

function paginateResults(data, page, limit) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {};
  results.templates = data.slice(startIndex, endIndex);
  
  if (endIndex < data.length) {
    results.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
      limit
    };
  }
  
  return {
    success: true,
    ...results,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(data.length / limit),
      totalTemplates: data.length,
      limit
    }
  };
}
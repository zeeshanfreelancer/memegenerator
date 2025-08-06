const mongoose = require('mongoose');

const textSchema = new mongoose.Schema({
  content: String,
  position: {
    x: Number,
    y: Number,
  },
  style: {
    fontFamily: String,
    fontSize: Number,
    fillColor: String,
    strokeColor: String,
    strokeWidth: Number,
    align: String,
  },
});

const memeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
  imageUrl: { type: String, required: true },
  texts: [textSchema],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Meme', memeSchema);
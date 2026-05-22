const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: [true, 'Article reference is required'],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    maxlength: [3600, 'Comment cannot exceed 600 words'],
  },
  isReported: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Comment', commentSchema);

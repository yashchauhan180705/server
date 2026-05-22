const mongoose = require('mongoose');

const charchaPatraSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide content'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    imagePath: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    linkedArticle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CharchaPatra', charchaPatraSchema);

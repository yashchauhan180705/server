const mongoose = require('mongoose');

const ePaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    publishDate: {
      type: Date,
      required: [true, 'Please provide a publish date'],
    },
    pdfUrl: {
      type: String,
      default: '',
    },
    pdfPath: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EPaper', ePaperSchema);

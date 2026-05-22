const mongoose = require('mongoose');
const crypto = require('crypto');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['register', 'login', 'reset-password'],
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Auto-delete when expired
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash OTP before saving (Mongoose 9 middleware no longer uses callback next)
otpSchema.pre('save', function () {
  if (this.isModified('otp') && this.otp.length === 6) {
    this.otp = crypto.createHash('sha256').update(this.otp).digest('hex');
  }
});

// Verify OTP
otpSchema.methods.verifyOTP = function (enteredOTP) {
  const hashedOTP = crypto.createHash('sha256').update(enteredOTP).digest('hex');
  return this.otp === hashedOTP;
};

// Static method to generate OTP
otpSchema.statics.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = mongoose.model('OTP', otpSchema);

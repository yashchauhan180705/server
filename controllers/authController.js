const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const RefreshToken = require('../models/RefreshToken');
const { sendOTPEmail } = require('../config/email');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    user: userId,
    token,
    expiresAt,
  });

  return token;
};

// @desc    Send OTP for registration or login
// @route   POST /api/auth/send-otp
const sendOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { purpose } = req.body;

    if (!['register', 'login', 'reset-password'].includes(purpose)) {
      return res.status(400).json({ message: 'Invalid purpose' });
    }

    // For registration, check if user already exists
    if (purpose === 'register') {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
    }

    // For login, check if user exists
    if (purpose === 'login') {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.isLocked) {
        const waitTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(423).json({
          message: `Account locked. Try again in ${waitTime} minutes.`,
        });
      }
    }

    // Check for recent OTP
    const recentOTP = await OTP.findOne({
      email,
      purpose,
      createdAt: { $gt: new Date(Date.now() - 60000) }, // 1 minute cooldown
    });

    if (recentOTP) {
      const elapsedMs = Date.now() - new Date(recentOTP.createdAt).getTime();
      const waitTime = Math.max(1, Math.ceil((60000 - elapsedMs) / 1000));
      return res.status(429).json({
        message: `Please wait ${waitTime} seconds before requesting another OTP`,
      });
    }

    // Delete existing OTPs
    await OTP.deleteMany({ email, purpose });

    // Generate new OTP
    const otpCode = OTP.generateOTP();
    console.log(`🔐 Generated OTP for ${email}: ${otpCode}`);

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const otpRecord = await OTP.create({
      email,
      otp: otpCode,
      purpose,
      expiresAt,
    });

    console.log(`✅ OTP record saved in database for ${email}`);

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otpCode, purpose);

    if (!emailResult.success) {
      console.error(`❌ Failed to send email to ${email}:`, emailResult.error);
      // Delete the OTP record if email failed
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(500).json({ message: 'Failed to send OTP. Please check your email configuration.' });
    }

    res.json({
      message: `OTP sent to ${email}`,
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    console.error('❌ Error in sendOTP:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
const verifyOTPCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp, purpose } = req.body;

    const otpRecord = await OTP.findOne({
      email,
      purpose,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'OTP expired or not found. Please request a new one.',
      });
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        message: 'Too many failed attempts. Please request a new OTP.',
      });
    }

    if (!otpRecord.verifyOTP(otp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts;
      return res.status(400).json({
        message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    // OTP verified - delete it
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({
      message: 'OTP verified successfully',
      verified: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register new user (with OTP verification)
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, password, otp } = req.body;
    const email = normalizeEmail(req.body.email);

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required for registration' });
    }

    const otpRecord = await OTP.findOne({
      email,
      purpose: 'register',
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'OTP expired or not found. Please request a new one.',
      });
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        message: 'Too many failed attempts. Please request a new OTP.',
      });
    }

    if (!otpRecord.verifyOTP(otp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts;
      return res.status(400).json({
        message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    const user = await User.create({
      name,
      email,
      password,
      isEmailVerified: true,
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSubscribed: user.isSubscribed,
      isEmailVerified: user.isEmailVerified,
      accessToken,
      refreshToken,
      token: accessToken, // For backward compatibility
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user (with OTP verification)
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { password, otp } = req.body;
    const email = normalizeEmail(req.body.email);

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is locked
    if (user.isLocked) {
      const waitTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account locked due to too many failed attempts. Try again in ${waitTime} minutes.`,
      });
    }

    // Verify password
    if (!(await user.matchPassword(password))) {
      // Increment login attempts
      user.loginAttempts += 1;

      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = Date.now() + LOCK_TIME;
      }

      await user.save();
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // OTP is mandatory for login
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required for login' });
    }

    const otpRecord = await OTP.findOne({
      email,
      purpose: 'login',
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'OTP expired or not found. Please request a new one.',
      });
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        message: 'Too many failed attempts. Please request a new OTP.',
      });
    }

    if (!otpRecord.verifyOTP(otp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts;
      return res.status(400).json({
        message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSubscribed: user.isSubscribed,
      isEmailVerified: user.isEmailVerified,
      accessToken,
      refreshToken,
      token: accessToken, // For backward compatibility
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const tokenRecord = await RefreshToken.findOne({
      token: refreshToken,
      expiresAt: { $gt: new Date() },
      isRevoked: false,
    }).populate('user');

    if (!tokenRecord) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    if (!tokenRecord.user) {
      tokenRecord.isRevoked = true;
      await tokenRecord.save();
      return res.status(401).json({ message: 'Refresh token user not found' });
    }

    if (tokenRecord.user.isBanned) {
      tokenRecord.isRevoked = true;
      await tokenRecord.save();
      return res.status(403).json({ message: 'Your account has been banned. Contact support.' });
    }

    const accessToken = generateAccessToken(tokenRecord.user._id);

    res.json({
      accessToken,
      token: accessToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user (revoke refresh token)
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.updateOne({ token: refreshToken }, { isRevoked: true });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'OTP and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const otpRecord = await OTP.findOne({
      email,
      purpose: 'reset-password',
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'OTP expired or not found. Please request a new one.',
      });
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        message: 'Too many failed attempts. Please request a new OTP.',
      });
    }

    if (!otpRecord.verifyOTP(otp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts;
      return res.status(400).json({
        message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  sendOTP,
  verifyOTPCode,
  refreshAccessToken,
  logout,
  resetPassword,
};

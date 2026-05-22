const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

const PLANS = {
  premium: { name: 'Premium', amount: 19900, duration: 30 }, // ₹199 in paise, 30 days
  'ads-free': { name: 'Ads-Free', amount: 9900, duration: 30 }, // ₹99 in paise, 30 days
};

// @desc    Activate a subscription directly (Mock Payment)
// @route   POST /api/subscription/subscribe
const subscribe = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan. Choose premium or ads-free.' });
    }

    // Check if user already has an active subscription
    const existingSub = await Subscription.findOne({
      user: req.user._id,
      status: 'active',
      endDate: { $gt: new Date() },
    });

    if (existingSub) {
      return res.status(400).json({
        message: `You already have an active ${existingSub.plan} subscription until ${existingSub.endDate.toLocaleDateString()}.`,
      });
    }

    const planDetails = PLANS[plan];
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + planDetails.duration * 24 * 60 * 60 * 1000);

    // Create an active subscription directly
    const subscription = await Subscription.create({
      user: req.user._id,
      plan,
      amount: planDetails.amount / 100, // Storing natural amount
      status: 'active',
      startDate,
      endDate,
    });

    // Update user subscription status
    const user = await User.findById(req.user._id);
    user.isSubscribed = true;
    user.subscriptionPlan = subscription.plan;
    user.subscriptionExpiry = endDate;
    await user.save();

    res.json({
      message: 'Subscription activated successfully!',
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user's subscription
// @route   GET /api/subscription/my-subscription
const getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active',
      endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!subscription) {
      // Check and reset user subscription if expired
      const user = await User.findById(req.user._id);
      if (user.isSubscribed) {
        user.isSubscribed = false;
        user.subscriptionPlan = 'none';
        user.subscriptionExpiry = null;
        await user.save();
      }

      return res.json({ active: false, subscription: null });
    }

    res.json({
      active: true,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: subscription.amount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel subscription
// @route   DELETE /api/subscription/cancel
const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active',
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    subscription.status = 'cancelled';
    await subscription.save();

    const user = await User.findById(req.user._id);
    user.isSubscribed = false;
    user.subscriptionPlan = 'none';
    user.subscriptionExpiry = null;
    await user.save();

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get subscription plans info
// @route   GET /api/subscription/plans
const getPlans = async (req, res) => {
  res.json({
    plans: [
      {
        id: 'premium',
        name: 'Premium',
        price: 199,
        currency: 'INR',
        period: 'month',
        features: [
          'Unlimited article access',
          'No advertisements',
          'E-Paper access',
          'Exclusive investigative reports',
          'Priority support',
        ],
      },
      {
        id: 'ads-free',
        name: 'Ads-Free',
        price: 99,
        currency: 'INR',
        period: 'month',
        features: [
          'No advertisements',
          'E-Paper access',
          'Email newsletter',
        ],
      },
    ],
  });
};

module.exports = { subscribe, getMySubscription, cancelSubscription, getPlans };

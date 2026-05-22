const User = require('../models/User');
const Article = require('../models/Article');
const Subscription = require('../models/Subscription');
const CharchaPatra = require('../models/CharchaPatra');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const totalArticles = await Article.countDocuments();
    const publishedArticles = await Article.countDocuments({ status: 'published' });
    const draftArticles = await Article.countDocuments({ status: 'draft' });
    const totalUsers = await User.countDocuments();
    const premiumArticles = await Article.countDocuments({ isPremium: true });
    const subscribedUsers = await User.countDocuments({ isSubscribed: true });
    const employeeCount = await User.countDocuments({ role: 'employee' });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active', endDate: { $gt: new Date() } });
    const pendingCharchapatra = await CharchaPatra.countDocuments({ status: 'pending' });

    res.json({
      totalArticles,
      publishedArticles,
      draftArticles,
      totalUsers,
      premiumArticles,
      subscribedUsers,
      employeeCount,
      bannedUsers,
      activeSubscriptions,
      pendingCharchapatra,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStats };


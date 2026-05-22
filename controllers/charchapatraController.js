const CharchaPatra = require('../models/CharchaPatra');
const Article = require('../models/Article');
const { deleteFile } = require('../middleware/multerConfig');

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const contentToHtml = (plainText = '') =>
  escapeHtml(plainText)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('');

const ensureLinkedArticle = async (item) => {
  if (item.status !== 'approved') {
    return item;
  }

  if (item.linkedArticle) {
    const existingArticle = await Article.findById(item.linkedArticle).select('_id');
    if (existingArticle) {
      return item;
    }
  }

  const article = await Article.create({
    title: item.title,
    content: contentToHtml(item.content),
    category: 'Charchapatra',
    imageUrl: item.imageUrl || '',
    imagePath: item.imagePath || '',
    isPremium: false,
    isCharchapatraEnabled: true,
    status: 'published',
    author: item.author,
    publishedAt: item.reviewedAt || new Date(),
  });

  item.linkedArticle = article._id;
  await item.save();
  return item;
};

// @desc    Submit a new Charcha Patra (authenticated user)
// @route   POST /api/charchapatra
const submitCharchaPatra = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const data = {
      title,
      content,
      author: req.user._id,
    };

    if (req.file) {
      data.imageUrl = req.file.path;
      data.imagePath = '';
    }

    const charchaPatra = await CharchaPatra.create(data);

    res.status(201).json({
      message: 'Charcha Patra submitted successfully! It will be visible after approval.',
      charchaPatra,
    });
  } catch (error) {
    if (req.file) {
      deleteFile(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get approved Charcha Patras (public)
// @route   GET /api/charchapatra
const getApprovedCharchaPatra = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { status: 'approved' };

    const total = await CharchaPatra.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const items = await CharchaPatra.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    for (const item of items) {
      await ensureLinkedArticle(item);
    }

    await CharchaPatra.populate(items, [
      { path: 'author', select: 'name' },
      { path: 'linkedArticle', select: '_id isCharchapatraEnabled status' },
    ]);

    res.json({
      charchaPatras: items,
      currentPage: page,
      totalPages,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all Charcha Patras for admin/employee
// @route   GET /api/admin/charchapatra
const getAdminCharchaPatra = async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const total = await CharchaPatra.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const items = await CharchaPatra.find(filter)
      .populate('author', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      charchaPatras: items,
      currentPage: page,
      totalPages,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a Charcha Patra
// @route   PUT /api/admin/charchapatra/:id/approve
const approveCharchaPatra = async (req, res) => {
  try {
    const item = await CharchaPatra.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Charcha Patra not found' });
    }

    item.status = 'approved';
    item.reviewedBy = req.user._id;
    item.reviewedAt = new Date();
    await item.save();
    await ensureLinkedArticle(item);

    const populated = await CharchaPatra.findById(item._id)
      .populate('author', 'name email')
      .populate('reviewedBy', 'name')
      .populate('linkedArticle', '_id isCharchapatraEnabled status');

    res.json({ message: 'Charcha Patra approved', charchaPatra: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a Charcha Patra
// @route   PUT /api/admin/charchapatra/:id/reject
const rejectCharchaPatra = async (req, res) => {
  try {
    const item = await CharchaPatra.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Charcha Patra not found' });
    }

    item.status = 'rejected';
    item.reviewedBy = req.user._id;
    item.reviewedAt = new Date();

    if (item.linkedArticle) {
      await Article.findByIdAndDelete(item.linkedArticle);
      item.linkedArticle = null;
    }

    await item.save();

    const populated = await CharchaPatra.findById(item._id)
      .populate('author', 'name email')
      .populate('reviewedBy', 'name');

    res.json({ message: 'Charcha Patra rejected', charchaPatra: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a Charcha Patra (Admin only)
// @route   DELETE /api/admin/charchapatra/:id
const deleteCharchaPatra = async (req, res) => {
  try {
    const item = await CharchaPatra.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Charcha Patra not found' });
    }

    // Delete associated image from Cloudinary if exists
    const cloudinaryImage = item.imageUrl || item.imagePath;
    if (cloudinaryImage && cloudinaryImage.includes('cloudinary')) {
      deleteFile(cloudinaryImage);
    }

    if (item.linkedArticle) {
      await Article.findByIdAndDelete(item.linkedArticle);
    }

    await item.deleteOne();
    res.json({ message: 'Charcha Patra deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitCharchaPatra,
  getApprovedCharchaPatra,
  getAdminCharchaPatra,
  approveCharchaPatra,
  rejectCharchaPatra,
  deleteCharchaPatra,
};

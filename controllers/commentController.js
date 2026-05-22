const Comment = require('../models/Comment');
const Article = require('../models/Article');

// @desc    Get active comments for an article
// @route   GET /api/articles/:id/comments
const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({
      article: req.params.id,
      status: 'active',
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Post a new comment
// @route   POST /api/articles/:id/comments
const createComment = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    if (!article.isCharchapatraEnabled) {
      return res
        .status(400)
        .json({ message: 'Discussions are not enabled for this article' });
    }

    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    // Check word count (max 600 words)
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 600) {
      return res
        .status(400)
        .json({ message: 'Comment cannot exceed 600 words' });
    }

    const comment = await Comment.create({
      article: req.params.id,
      user: req.user._id,
      text: text.trim(),
    });

    // Populate user info before returning
    await comment.populate('user', 'name');

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Report a comment
// @route   POST /api/comments/:id/report
const reportComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.status === 'deleted') {
      return res.status(400).json({ message: 'Comment has been deleted' });
    }

    comment.isReported = true;
    await comment.save();

    res.json({ message: 'Comment reported to admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all comments (Admin)
// @route   GET /api/admin/comments
const getAllComments = async (req, res) => {
  try {
    const { reported } = req.query;
    let filter = {};

    if (reported === 'true') {
      filter.isReported = true;
    }

    const comments = await Comment.find(filter)
      .populate('user', 'name')
      .populate('article', 'title')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a comment (Admin only)
// @route   PUT /api/admin/comments/:id
const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const { text, status, isReported } = req.body;

    if (text !== undefined) comment.text = text.trim();
    if (status !== undefined) comment.status = status;
    if (isReported !== undefined) comment.isReported = isReported;

    await comment.save();
    await comment.populate('user', 'name');
    await comment.populate('article', 'title');

    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Soft delete a comment (Admin)
// @route   DELETE /api/admin/comments/:id
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.status = 'deleted';
    await comment.save();

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unflag a reported comment (Admin)
// @route   PUT /api/admin/comments/:id/unflag
const unflagComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.isReported = false;
    await comment.save();

    res.json({ message: 'Comment flag dismissed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getComments,
  createComment,
  reportComment,
  getAllComments,
  updateComment,
  deleteComment,
  unflagComment,
};

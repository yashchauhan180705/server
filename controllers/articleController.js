const Article = require('../models/Article');
const { deleteFile } = require('../middleware/multerConfig');

// @desc    Get all articles (public — only published)
// @route   GET /api/articles
const getArticles = async (req, res) => {
  try {
    const { category, search, charchapatra } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    // Backward compatibility: some older seeded/local records have publishedAt set but status still draft.
    let filter = {
      $or: [
        { status: 'published' },
        { status: 'draft', publishedAt: { $ne: null } },
      ],
    };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    if (charchapatra === 'true') {
      filter.isCharchapatraEnabled = true;
    }

    const totalArticles = await Article.countDocuments(filter);
    const totalPages = Math.ceil(totalArticles / limit);

    const articles = await Article.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .select('-content')
      .skip(skip)
      .limit(limit);

    res.json({
      articles,
      currentPage: page,
      totalPages,
      totalArticles,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single article by ID
// @route   GET /api/articles/:id
const getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // If article is premium, check user subscription
    if (article.isPremium) {
      const isSubscribed = req.user && req.user.isSubscribed;
      const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'employee');

      if (!isSubscribed && !isAdmin) {
        // Return truncated content
        const truncatedContent =
          article.content.substring(0, 500) + '...';
        return res.json({
          ...article.toObject(),
          content: truncatedContent,
          isContentTruncated: true,
        });
      }
    }

    res.json({ ...article.toObject(), isContentTruncated: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all articles for admin (including drafts)
// @route   GET /api/admin/articles (called via admin panel)
const getAdminArticles = async (req, res) => {
  try {
    const { category, search, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const totalArticles = await Article.countDocuments(filter);
    const totalPages = Math.ceil(totalArticles / limit);

    const articles = await Article.find(filter)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      articles,
      currentPage: page,
      totalPages,
      totalArticles,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new article (Admin/Employee)
// @route   POST /api/admin/articles
const createArticle = async (req, res) => {
  try {
    const { title, content, category, imageUrl, isPremium, isCharchapatraEnabled, status } = req.body;

    const articleData = {
      title,
      content,
      category,
      isPremium: isPremium === 'true' || isPremium === true,
      isCharchapatraEnabled: isCharchapatraEnabled === 'true' || isCharchapatraEnabled === true,
      status: status || 'published',
      author: req.user._id,
    };

    // Set publishedAt if publishing immediately
    if (articleData.status === 'published') {
      articleData.publishedAt = new Date();
    }

    // Handle file upload (Cloudinary)
    if (req.file) {
      articleData.imageUrl = req.file.path;
      articleData.imagePath = '';
    } else if (imageUrl) {
      articleData.imageUrl = imageUrl;
      articleData.imagePath = '';
    }

    const article = await Article.create(articleData);

    res.status(201).json(article);
  } catch (error) {
    // Clean up uploaded file from Cloudinary if article creation fails
    if (req.file) {
      deleteFile(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update article (Admin/Employee)
// @route   PUT /api/admin/articles/:id
const updateArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const { title, content, category, imageUrl, isPremium, isCharchapatraEnabled, status } = req.body;

    // Update fields
    if (title) article.title = title;
    if (content) article.content = content;
    if (category) article.category = category;
    article.isPremium = isPremium === 'true' || isPremium === true;
    article.isCharchapatraEnabled = isCharchapatraEnabled === 'true' || isCharchapatraEnabled === true;

    if (status) {
      article.status = status;
      if (status === 'published' && !article.publishedAt) {
        article.publishedAt = new Date();
      }
    }

    // Handle file upload (Cloudinary)
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (article.imageUrl) {
        deleteFile(article.imageUrl);
      }
      article.imageUrl = req.file.path;
      article.imagePath = '';
    } else if (imageUrl !== undefined) {
      // If URL provided, delete any existing Cloudinary file
      if (article.imageUrl && article.imageUrl.includes('cloudinary')) {
        deleteFile(article.imageUrl);
      }
      article.imagePath = '';
      article.imageUrl = imageUrl;
    }

    await article.save();
    res.json(article);
  } catch (error) {
    // Clean up uploaded file from Cloudinary if update fails
    if (req.file) {
      deleteFile(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete article (Admin only)
// @route   DELETE /api/admin/articles/:id
const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Delete associated image from Cloudinary
    if (article.imageUrl && article.imageUrl.includes('cloudinary')) {
      deleteFile(article.imageUrl);
    }

    await article.deleteOne();
    res.json({ message: 'Article removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Publish article (Admin only)
// @route   PUT /api/admin/articles/:id/publish
const publishArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    article.status = 'published';
    article.publishedAt = new Date();
    await article.save();

    res.json({ message: 'Article published', article });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unpublish article (Admin only)
// @route   PUT /api/admin/articles/:id/unpublish
const unpublishArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    article.status = 'draft';
    await article.save();

    res.json({ message: 'Article unpublished', article });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getArticles, getArticleById, getAdminArticles, createArticle, updateArticle, deleteArticle, publishArticle, unpublishArticle };

const EPaper = require('../models/EPaper');
const { deleteFile } = require('../middleware/multerConfig');

// @desc    Get all e-papers (public)
// @route   GET /api/epapers
const getEPapers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const totalEPapers = await EPaper.countDocuments();
    const totalPages = Math.ceil(totalEPapers / limit);

    const epapers = await EPaper.find()
      .sort({ publishDate: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      epapers,
      currentPage: page,
      totalPages,
      totalEPapers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single e-paper by ID
// @route   GET /api/epapers/:id
const getEPaperById = async (req, res) => {
  try {
    const epaper = await EPaper.findById(req.params.id);
    if (!epaper) {
      return res.status(404).json({ message: 'E-Paper not found' });
    }
    res.json(epaper);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new e-paper (Admin only)
// @route   POST /api/admin/epapers
const createEPaper = async (req, res) => {
  try {
    const { title, publishDate, pdfUrl } = req.body;

    const epaperData = {
      title,
      publishDate,
    };

    // Handle file upload (Cloudinary)
    if (req.file) {
      epaperData.pdfUrl = req.file.path;
      epaperData.pdfPath = '';
    } else if (pdfUrl) {
      epaperData.pdfUrl = pdfUrl;
      epaperData.pdfPath = '';
    } else {
      return res.status(400).json({ message: 'Please provide a PDF file or URL' });
    }

    const epaper = await EPaper.create(epaperData);

    res.status(201).json(epaper);
  } catch (error) {
    // Clean up uploaded file from Cloudinary if creation fails
    if (req.file) {
      deleteFile(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update e-paper (Admin only)
// @route   PUT /api/admin/epapers/:id
const updateEPaper = async (req, res) => {
  try {
    const epaper = await EPaper.findById(req.params.id);

    if (!epaper) {
      return res.status(404).json({ message: 'E-Paper not found' });
    }

    const { title, publishDate, pdfUrl } = req.body;

    // Update fields
    if (title) epaper.title = title;
    if (publishDate) epaper.publishDate = publishDate;

    // Handle file upload (Cloudinary)
    if (req.file) {
      // Delete old PDF from Cloudinary if exists
      if (epaper.pdfUrl && epaper.pdfUrl.includes('cloudinary')) {
        deleteFile(epaper.pdfUrl);
      }
      epaper.pdfUrl = req.file.path;
      epaper.pdfPath = '';
    } else if (pdfUrl !== undefined) {
      // If URL provided, delete any existing Cloudinary file
      if (epaper.pdfUrl && epaper.pdfUrl.includes('cloudinary')) {
        deleteFile(epaper.pdfUrl);
      }
      epaper.pdfPath = '';
      epaper.pdfUrl = pdfUrl;
    }

    await epaper.save();
    res.json(epaper);
  } catch (error) {
    // Clean up uploaded file from Cloudinary if update fails
    if (req.file) {
      deleteFile(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete e-paper (Admin only)
// @route   DELETE /api/admin/epapers/:id
const deleteEPaper = async (req, res) => {
  try {
    const epaper = await EPaper.findById(req.params.id);
    if (!epaper) {
      return res.status(404).json({ message: 'E-Paper not found' });
    }

    // Delete associated PDF from Cloudinary
    if (epaper.pdfUrl && epaper.pdfUrl.includes('cloudinary')) {
      deleteFile(epaper.pdfUrl);
    }

    await epaper.deleteOne();
    res.json({ message: 'E-Paper removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEPapers, getEPaperById, createEPaper, updateEPaper, deleteEPaper };

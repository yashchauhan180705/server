const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const requiredCloudinaryEnv = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const cloudinaryEnv = {
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
};

const missingCloudinaryEnv = requiredCloudinaryEnv.filter((key) => {
  if (key === 'CLOUDINARY_CLOUD_NAME') return !cloudinaryEnv.cloud_name;
  if (key === 'CLOUDINARY_API_KEY') return !cloudinaryEnv.api_key;
  if (key === 'CLOUDINARY_API_SECRET') return !cloudinaryEnv.api_secret;
  return false;
});
const cloudinaryConfigured = missingCloudinaryEnv.length === 0;

if (process.env.NODE_ENV !== 'test' && !cloudinaryConfigured) {
  console.warn(
    `Cloudinary is not configured. Upload routes will be disabled until these env vars are set: ${missingCloudinaryEnv.join(', ')}`
  );
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudinaryEnv.cloud_name,
  api_key: cloudinaryEnv.api_key,
  api_secret: cloudinaryEnv.api_secret,
});

// Cloudinary storage for images
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'newsportal/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

// Cloudinary storage for PDFs
const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'newsportal/pdfs',
    allowed_formats: ['pdf'],
    resource_type: 'raw',
  },
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, JPG, PNG, GIF, WebP, BMP, TIFF, and SVG are allowed.'
      ),
      false
    );
  }
};

// File filter for PDFs
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
  }
};

const uploadDisabled = {
  single: () => (req, res, next) => {
    next(
      new Error(
        `Cloudinary is not configured. Missing env vars: ${missingCloudinaryEnv.join(', ')}`
      )
    );
  },
};

// Image upload middleware
const uploadImage = cloudinaryConfigured
  ? multer({
      storage: imageStorage,
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    })
  : uploadDisabled;

// PDF upload middleware
const uploadPDF = cloudinaryConfigured
  ? multer({
      storage: pdfStorage,
      fileFilter: pdfFileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    })
  : uploadDisabled;

// Delete file from Cloudinary
const deleteFile = async (fileUrl) => {
  if (!cloudinaryConfigured) return;
  if (!fileUrl || !fileUrl.includes('res.cloudinary.com')) return;

  try {
    const cleanUrl = fileUrl.split('?')[0];
    const isRaw = cleanUrl.includes('/raw/upload/');
    const resourceType = isRaw ? 'raw' : 'image';

    const marker = `${resourceType}/upload/`;
    const markerIndex = cleanUrl.indexOf(marker);
    if (markerIndex === -1) return;

    const afterUpload = cleanUrl.slice(markerIndex + marker.length);
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    const publicId = isRaw
      ? withoutVersion
      : withoutVersion.replace(/\.[^/.]+$/, '');

    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`Deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error.message);
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadPDF,
  deleteFile,
};

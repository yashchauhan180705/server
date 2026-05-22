const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const dns = require('dns');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const customDnsServers = (process.env.DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (customDnsServers.length > 0) {
  dns.setServers(customDnsServers);
}

const Article = require('../models/Article');
const CharchaPatra = require('../models/CharchaPatra');
const EPaper = require('../models/EPaper');

const isCloudinaryUrl = (value) => /^https?:\/\/res\.cloudinary\.com\//i.test(value || '');

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in server/.env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const [
    articleLocalPathCount,
    charchaLocalPathCount,
    epaperLocalPathCount,
    articleUrls,
    charchaUrls,
    epaperUrls,
  ] = await Promise.all([
    Article.countDocuments({ imagePath: { $exists: true, $ne: '' } }),
    CharchaPatra.countDocuments({ imagePath: { $exists: true, $ne: '' } }),
    EPaper.countDocuments({ pdfPath: { $exists: true, $ne: '' } }),
    Article.find({ imageUrl: { $exists: true, $ne: '' } }).select('imageUrl').lean(),
    CharchaPatra.find({ imageUrl: { $exists: true, $ne: '' } }).select('imageUrl').lean(),
    EPaper.find({ pdfUrl: { $exists: true, $ne: '' } }).select('pdfUrl').lean(),
  ]);

  const nonCloudArticleUrls = articleUrls.filter((doc) => !isCloudinaryUrl(doc.imageUrl)).length;
  const nonCloudCharchaUrls = charchaUrls.filter((doc) => !isCloudinaryUrl(doc.imageUrl)).length;
  const nonCloudEpaperUrls = epaperUrls.filter((doc) => !isCloudinaryUrl(doc.pdfUrl)).length;

  const report = {
    localPathReferences: {
      articleImagePath: articleLocalPathCount,
      charchaImagePath: charchaLocalPathCount,
      epaperPdfPath: epaperLocalPathCount,
    },
    nonCloudinaryUrlReferences: {
      articleImageUrl: nonCloudArticleUrls,
      charchaImageUrl: nonCloudCharchaUrls,
      epaperPdfUrl: nonCloudEpaperUrls,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Verification failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect errors on failure path.
  }
  process.exit(1);
});



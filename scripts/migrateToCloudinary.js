/**
 * One-time Migration Script: Local uploads → Cloudinary
 *
 * This script reads all images/PDFs from the local `uploads/` directory,
 * uploads them to Cloudinary, and updates the corresponding MongoDB records
 * (Articles, CharchaPatras, EPapers) with the new Cloudinary URLs.
 *
 * Usage:
 *   node scripts/migrateToCloudinary.js
 *
 * Prerequisites:
 *   - Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env
 *   - Ensure MONGO_URI is configured correctly in .env
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');

// Models
const Article = require('../models/Article');
const CharchaPatra = require('../models/CharchaPatra');
const EPaper = require('../models/EPaper');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Upload a local file to Cloudinary and return the secure URL.
 */
async function uploadToCloudinary(localPath, folder, resourceType = 'image') {
  const result = await cloudinary.uploader.upload(localPath, {
    folder,
    resource_type: resourceType,
  });
  return result.secure_url;
}

// ── Migration functions ──────────────────────────────────────────────────────

async function migrateArticles() {
  console.log('\n📰 Migrating Articles …');
  const articles = await Article.find({
    $or: [
      { imagePath: { $exists: true, $ne: '' } },
      {
        imageUrl: {
          $exists: true,
          $ne: '',
          $not: /^https?:\/\/res\.cloudinary\.com\//i,
        },
      },
    ],
  });

  console.log(`   Found ${articles.length} article(s) with local imagePath`);

  let success = 0;
  let skipped = 0;

  for (const article of articles) {
    const localFile = path.join(UPLOADS_DIR, ...article.imagePath.replace(/^uploads[/\\]/, '').split(/[/\\]/));

    if (!fs.existsSync(localFile)) {
      console.log(`   ⚠ File not found, skipping: ${article.imagePath}`);
      skipped++;
      continue;
    }

    try {
      const url = await uploadToCloudinary(localFile, 'newsportal/images', 'image');
      article.imageUrl = url;
      article.imagePath = '';
      await article.save();
      console.log(`   ✔ ${article.title} → ${url}`);
      success++;
    } catch (err) {
      console.error(`   ✖ Failed for "${article.title}": ${err.message}`);
    }
  }

  console.log(`   Done – ${success} migrated, ${skipped} skipped`);
}

async function migrateCharchaPatras() {
  console.log('\n💬 Migrating Charcha Patras …');
  const items = await CharchaPatra.find({
    $or: [
      { imagePath: { $exists: true, $ne: '' } },
      {
        imageUrl: {
          $exists: true,
          $ne: '',
          $not: /^https?:\/\/res\.cloudinary\.com\//i,
        },
      },
    ],
  });

  console.log(`   Found ${items.length} charcha patra(s) with local imagePath`);

  let success = 0;
  let skipped = 0;

  for (const item of items) {
    const localFile = path.join(UPLOADS_DIR, ...item.imagePath.replace(/^uploads[/\\]/, '').split(/[/\\]/));

    if (!fs.existsSync(localFile)) {
      console.log(`   ⚠ File not found, skipping: ${item.imagePath}`);
      skipped++;
      continue;
    }

    try {
      const url = await uploadToCloudinary(localFile, 'newsportal/images', 'image');
      item.imagePath = url;
      await item.save();
      console.log(`   ✔ ${item.title} → ${url}`);
      success++;
    } catch (err) {
      console.error(`   ✖ Failed for "${item.title}": ${err.message}`);
    }
  }

  console.log(`   Done – ${success} migrated, ${skipped} skipped`);
}

async function migrateEPapers() {
  console.log('\n📄 Migrating E-Papers …');
  const epapers = await EPaper.find({
    $or: [
      { pdfPath: { $exists: true, $ne: '' } },
      {
        pdfUrl: {
          $exists: true,
          $ne: '',
          $not: /^https?:\/\/res\.cloudinary\.com\//i,
        },
      },
    ],
  });

  console.log(`   Found ${epapers.length} e-paper(s) with local pdfPath`);

  let success = 0;
  let skipped = 0;

  for (const epaper of epapers) {
    const localFile = path.join(UPLOADS_DIR, ...epaper.pdfPath.replace(/^uploads[/\\]/, '').split(/[/\\]/));

    if (!fs.existsSync(localFile)) {
      console.log(`   ⚠ File not found, skipping: ${epaper.pdfPath}`);
      skipped++;
      continue;
    }

    try {
      const url = await uploadToCloudinary(localFile, 'newsportal/pdfs', 'raw');
      epaper.pdfUrl = url;
      epaper.pdfPath = '';
      await epaper.save();
      console.log(`   ✔ ${epaper.title} → ${url}`);
      success++;
    } catch (err) {
      console.error(`   ✖ Failed for "${epaper.title}": ${err.message}`);
    }
  }

  console.log(`   Done – ${success} migrated, ${skipped} skipped`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Cloudinary Migration Script');
  console.log('═══════════════════════════════════════════════════');

  // Validate env
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('\n❌ Missing Cloudinary credentials in .env file!');
    console.error('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('\n❌ Missing MONGO_URI in .env file!');
    process.exit(1);
  }

  console.log('\nConnecting to MongoDB …');
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');

  // Run migrations
  await migrateArticles();
  await migrateCharchaPatras();
  await migrateEPapers();

  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Migration Complete!');
  console.log('═══════════════════════════════════════════════════');
  console.log('\nYou can now safely remove the local uploads/ directory.');
  console.log('(But keep a backup just in case!)\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

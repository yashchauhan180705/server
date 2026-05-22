const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Article = require('../models/Article');

dotenv.config();

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment variables');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const result = await Article.updateMany(
    { status: 'draft' },
    { $set: { status: 'published' } }
  );

  // Ensure legacy drafts get a publish timestamp for proper sorting on public pages.
  await Article.updateMany(
    { status: 'published', publishedAt: null },
    { $set: { publishedAt: new Date() } }
  );

  console.log(
    `Drafts published: matched=${result.matchedCount}, modified=${result.modifiedCount}`
  );

  await mongoose.disconnect();
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`Migration failed: ${error.message}`);
    try {
      await mongoose.disconnect();
    } catch (_) {
      // Ignore disconnect errors on failure path.
    }
    process.exit(1);
  });



const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_URI_FALLBACK;

  if (!primaryUri) {
    console.error('Error: MONGO_URI is missing in environment variables');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(primaryUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const isSrvDnsError = primaryUri.startsWith('mongodb+srv://')
      && /(querySrv|ENOTFOUND|ECONNREFUSED)/i.test(error.message);

    if (fallbackUri && isSrvDnsError) {
      try {
        console.warn('Primary Atlas SRV URI failed, trying MONGO_URI_FALLBACK...');
        const conn = await mongoose.connect(fallbackUri);
        console.log(`MongoDB Connected (fallback): ${conn.connection.host}`);
        return;
      } catch (fallbackError) {
        console.error(`Fallback Error: ${fallbackError.message}`);
      }
    }

    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

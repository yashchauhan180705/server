const path = require('path');
const dotenv = require('dotenv');
const { v2: cloudinary } = require('cloudinary');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  const images = await cloudinary.api.resources({
    type: 'upload',
    resource_type: 'image',
    prefix: 'newsportal/images',
    max_results: 10,
  });

  const raws = await cloudinary.api.resources({
    type: 'upload',
    resource_type: 'raw',
    prefix: 'newsportal/pdfs',
    max_results: 10,
  });

  console.log(
    JSON.stringify(
      {
        imageCount: images.total_count,
        rawCount: raws.total_count,
        sampleImagePublicIds: (images.resources || []).map((r) => r.public_id),
        sampleRawPublicIds: (raws.resources || []).map((r) => r.public_id),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('Cloudinary check failed:', error.message || error.error?.message || error);
  if (error.http_code || error.name) {
    console.error(
      JSON.stringify(
        {
          name: error.name,
          http_code: error.http_code,
          error: error.error,
        },
        null,
        2
      )
    );
  }
  process.exit(1);
});



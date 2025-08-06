const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (base64Image, folder) => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: `memes/${folder}`,
      resource_type: 'image'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

module.exports = {
  cloudinary,           // ✅ Add this
  uploadToCloudinary    // Optional: Keep this if you're using it elsewhere
};

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// The developer should populate these in their .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME',
  api_key: process.env.CLOUDINARY_API_KEY || 'YOUR_API_KEY',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'YOUR_API_SECRET',
});

// Configure Multer storage engine using Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Note: multer-storage-cloudinary expects 'params' to yield an object.
    return {
      folder: 'unsquare_client_documents', 
      // format: file.mimetype.split('/')[1], // optional forced format
      resource_type: 'auto', // Important for PDFs/non-image docs
    };
  },
});

// Reusable upload middleware restricted to 5MB max
export const uploadMiddleware = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 } 
});

export { cloudinary };

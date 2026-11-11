const cloudinary = require("cloudinary").v2;

/**
 * Upload service — Cloudinary-first, local fallback.
 *
 * Why: production image storage must survive restarts / multi-instance deploys.
 * If CLOUDINARY_* env vars are missing, falls back to existing local /uploads flow
 * so local dev keeps working without extra setup.
 */

let configured = false;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  configured = true;
}

const isCloudinaryEnabled = () => configured;

const uploadBuffer = ({ buffer, folder = "ecommerce/products", publicId }) =>
  new Promise((resolve, reject) => {
    if (!configured) return reject(new Error("Cloudinary not configured"));
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto", fetch_format: "auto" }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

const deleteImage = async (publicId) => {
  if (!configured || !publicId) return null;
  return cloudinary.uploader.destroy(publicId);
};

module.exports = { cloudinary, isCloudinaryEnabled, uploadBuffer, deleteImage };

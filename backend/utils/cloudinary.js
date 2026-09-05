/**
 * Thin wrapper around the Cloudinary SDK used for Task file storage
 * (mentor-uploaded task files, student-uploaded submission files).
 *
 * Never stores file binaries in Postgres -- only the values this module
 * returns (secure_url, public_id, resource_type, format, bytes) are
 * persisted to the database. Credentials come exclusively from
 * environment variables (see backend/.env.example); nothing here is
 * hardcoded.
 */
const cloudinary = require('cloudinary').v2;

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, ' +
      'and CLOUDINARY_API_SECRET in backend/.env.'
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  configured = true;
}

/**
 * Uploads a file buffer (as received from multer's memory storage) to
 * Cloudinary and resolves with the fields we persist to the database.
 *
 * @param {Buffer} buffer
 * @param {{ folder: string, filenameHint?: string }} options
 * @returns {Promise<{ secure_url: string, public_id: string, resource_type: string, format: string|null, bytes: number }>}
 */
function uploadBuffer(buffer, { folder, filenameHint } = {}) {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        // 'auto' lets Cloudinary pick image vs raw (e.g. PDF) based on the
        // actual file content rather than trusting a client-supplied
        // extension/mimetype.
        resource_type: 'auto',
        use_filename: Boolean(filenameHint),
        unique_filename: true,
        filename_override: filenameHint,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

module.exports = { uploadBuffer };

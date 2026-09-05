/**
 * Shared multer configuration for Task file uploads (mentor task files,
 * student submission files). Files are held in memory only long enough to
 * stream them to Cloudinary -- never written to disk, never stored in
 * Postgres.
 *
 * Validation happens server-side against the actual mimetype multer
 * detects, not a client-supplied file extension, per the brief's
 * "don't trust only the frontend file extension" requirement.
 */
const multer = require('multer');

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
      const err = new Error('Only PDF, JPG, PNG, or WEBP files are allowed.');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

/**
 * Wraps a multer single-file middleware so upload errors (wrong type, too
 * large, missing field) come back as a normal { error } JSON response
 * instead of an unhandled exception / Express default HTML error page.
 */
function singleFileUpload(fieldName) {
  const middleware = upload.single(fieldName);
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File is too large. Maximum size is 15MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(err.status || 400).json({ error: err.message });
      }
      next();
    });
  };
}

module.exports = { singleFileUpload, MAX_FILE_SIZE_BYTES };

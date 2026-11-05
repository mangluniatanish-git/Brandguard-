import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { requireAuth } from '../middleware/auth.js';

export const uploadRouter = Router();

// In-memory file storage for safe transient processing without disk storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.docx', '.txt'];
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/x-zip-compressed',
      'application/octet-stream',
      'text/plain',
    ];

    if (!allowedExts.includes(ext) || !allowedMimes.includes(file.mimetype)) {
      const err = new Error('Invalid file type. Only PDF, DOCX, and TXT files under 5 MB are permitted.');
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

function handleUploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(err.statusCode || 400).json({
        error: 'Upload Error',
        message: err.message,
      });
    }
    next();
  });
}

/**
 * POST /api/upload
 * Extracts text from uploaded PDF, DOCX, or TXT document.
 * Returns { text, chars }.
 * Returns 422 "No readable text (maybe a scanned PDF)" if no text is found.
 */
uploadRouter.post(
  '/',
  requireAuth,
  handleUploadMiddleware,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'No file uploaded. Please provide a PDF, DOCX, or TXT file.',
        });
      }

      const { buffer, originalname, mimetype } = req.file;
      const ext = path.extname(originalname).toLowerCase();
      let extractedText = '';

      if (ext === '.pdf' || mimetype === 'application/pdf') {
        const data = await pdfParse(new Uint8Array(buffer));
        extractedText = data.text || '';
      } else if (
        ext === '.docx' ||
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimetype === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } else if (ext === '.txt' || mimetype === 'text/plain') {
        extractedText = buffer.toString('utf-8');
      }

      // Clean up whitespace
      const cleaned = extractedText.replace(/\r\n/g, '\n').trim();

      if (!cleaned) {
        return res.status(422).json({
          error: 'Unprocessable Entity',
          message: 'No readable text (maybe a scanned PDF)',
        });
      }

      res.json({
        text: cleaned,
        chars: cleaned.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * FileStorageService — File Upload Management
 * Decodes base64 file data from the JSON body and saves to disk.
 * Returns a file metadata object stored in submissions.json.
 */
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// Whitelisted file extensions
const ALLOWED_EXTENSIONS = new Set([
  'pdf','docx','doc','ppt','pptx','xls','xlsx',
  'py','java','js','ts','c','cpp','cs','rb','go','php','swift',
  'zip','rar','tar','gz',
  'txt','md','json','xml','html','css',
  'jpg','jpeg','png',
]);

class FileStorageService {
  /**
   * @param {string} uploadsDir - Absolute path to the uploads directory
   */
  constructor(uploadsDir) {
    this._uploadsDir = uploadsDir;
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`[FileStorageService] Created uploads directory: ${uploadsDir}`);
    }
  }

  /**
   * Validate and save an uploaded file from a base64 payload.
   *
   * @param {{
   *   fileName: string,
   *   fileData: string,   base64-encoded file content
   *   maxSizeMB?: number
   * }} filePayload
   * @returns {{ success: boolean, fileMeta?: Object, error?: string }}
   */
  saveFile(filePayload) {
    const { fileName, fileData, maxSizeMB = 10 } = filePayload;

    // ① Validate filename and extension
    if (!fileName || !fileData) {
      return { success: false, error: 'fileName and fileData are required.' };
    }
    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { success: false, error: `File type '.${ext}' is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}` };
    }

    // ② Decode base64
    let fileBuffer;
    try {
      // Strip data URL prefix if present: "data:application/pdf;base64,..."
      const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
      fileBuffer = Buffer.from(base64Data, 'base64');
    } catch {
      return { success: false, error: 'Invalid base64 file data.' };
    }

    // ③ Check size
    const sizeMB = fileBuffer.length / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return { success: false, error: `File too large. Max size: ${maxSizeMB}MB. Actual: ${sizeMB.toFixed(2)}MB.` };
    }

    // ④ Generate unique stored filename
    const uniqueId    = crypto.randomBytes(8).toString('hex');
    const safeBase    = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedName  = `${uniqueId}_${safeBase}`;
    const storedPath  = path.join(this._uploadsDir, storedName);

    // ⑤ Write to disk
    try {
      fs.writeFileSync(storedPath, fileBuffer);
    } catch (err) {
      return { success: false, error: `Failed to save file: ${err.message}` };
    }

    const fileMeta = {
      originalName: fileName,
      storedName,
      extension:    ext,
      sizeMB:       parseFloat(sizeMB.toFixed(3)),
      uploadedAt:   new Date().toISOString(),
    };

    console.log(`[FileStorageService] Saved: ${fileName} → ${storedName} (${sizeMB.toFixed(2)}MB)`);
    return { success: true, fileMeta };
  }

  /**
   * Read a stored file and return it as a Buffer.
   * @param {string} storedName
   * @returns {{ success: boolean, buffer?: Buffer, error?: string }}
   */
  readFile(storedName) {
    const filePath = path.join(this._uploadsDir, storedName);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found.' };
    }
    return { success: true, buffer: fs.readFileSync(filePath) };
  }

  /** Return all stored file names */
  listFiles() {
    return fs.readdirSync(this._uploadsDir);
  }
}

module.exports = FileStorageService;

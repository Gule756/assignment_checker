/**
 * ================================================================
 *  SubmissionService.js — Facade Pattern
 * ================================================================
 *  Pattern : FACADE (Structural GoF)
 *  Intent  : Provide a simplified interface to a complex set of
 *            subsystems (DB, validation, receipt generation, events).
 *
 *  Now handles:  fullName, studentNumber, filePath, originalFilename
 * ================================================================
 */
const crypto = require('crypto');
const Database = require('./db');

// ── DB migration: ensure table has all required columns ──────────
async function initTable() {
  await Database.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id                SERIAL PRIMARY KEY,
      receipt_id        VARCHAR(60) UNIQUE NOT NULL,
      student_id        INTEGER NOT NULL,
      student_name      VARCHAR(100),
      course_id         VARCHAR(50) NOT NULL,
      full_name         VARCHAR(200),
      student_number    VARCHAR(50),
      file_path         TEXT,
      original_filename VARCHAR(255),
      status            VARCHAR(20) DEFAULT 'ON_TIME',
      message           TEXT,
      submitted_at      TIMESTAMP DEFAULT NOW()
    )
  `);
  // Safe migration: add columns if the table already existed without them
  const cols = [
    'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS full_name         VARCHAR(200)',
    'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS student_number    VARCHAR(50)',
    'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS file_path         TEXT',
    'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255)',
  ];
  for (const sql of cols) {
    await Database.query(sql).catch(() => {}); // ignore if already exists
  }
  console.log('[DB] OK - submissions table ready');
}

initTable().catch(err => console.error('[DB] submissions init error:', err.message));


class SubmissionService {

  /**
   * Facade method: validate → receipt ID → save → emit → return.
   * @param {{ studentId, studentName, courseId, fullName, studentNumber, filePath, originalFilename }} data
   * @param {EventEmitter} eventBus
   */
  static async create(data, eventBus) {
    const { studentId, studentName, courseId, fullName, studentNumber, filePath, originalFilename } = data;

    // Validate required fields
    if (!courseId)      throw new Error('Course ID is required');
    if (!fullName)      throw new Error('Full name is required');
    if (!studentNumber) throw new Error('Student ID number is required');
    if (!filePath)      throw new Error('File upload is required');

    // Generate cryptographic receipt ID (SHA-256 based)
    const receiptId = 'RCT-' + crypto
      .createHash('sha256')
      .update(`${studentId}${courseId}${filePath}${Date.now()}`)
      .digest('hex')
      .substring(0, 12)
      .toUpperCase();

    const status  = 'ON_TIME';
    const message = 'Assignment received. Official digital receipt issued.';

    const result = await Database.query(
      `INSERT INTO submissions
         (receipt_id, student_id, student_name, course_id, full_name, student_number,
          file_path, original_filename, status, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [receiptId, studentId, studentName, courseId, fullName, studentNumber,
       filePath, originalFilename, status, message]
    );

    const submission = result.rows[0];

    // Observer: emit event so listeners (NotificationAdapter) react
    if (eventBus) {
      eventBus.emit('submission', {
        receiptId,
        studentName: fullName,
        courseId,
        status,
        studentNumber,
        file: originalFilename,
      });
    }

    return submission;
  }

  /** All submissions — for teachers */
  static async getAll() {
    const result = await Database.query(
      'SELECT * FROM submissions ORDER BY submitted_at DESC'
    );
    return result.rows;
  }

  /** Only this student's submissions */
  static async getForStudent(studentId) {
    const result = await Database.query(
      'SELECT * FROM submissions WHERE student_id=$1 ORDER BY submitted_at DESC',
      [studentId]
    );
    return result.rows;
  }

  /** Single submission by receipt ID */
  static async getByReceiptId(receiptId) {
    const result = await Database.query(
      'SELECT * FROM submissions WHERE receipt_id=$1',
      [receiptId]
    );
    return result.rows[0] || null;
  }

  /** Dashboard stats */
  static async getStats() {
    const result = await Database.query(`
      SELECT
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (WHERE status='ON_TIME')      AS on_time,
        COUNT(*) FILTER (WHERE status='LATE')         AS late,
        COUNT(*) FILTER (WHERE status='REJECTED')     AS rejected
      FROM submissions
    `);
    return result.rows[0];
  }
}

module.exports = SubmissionService;

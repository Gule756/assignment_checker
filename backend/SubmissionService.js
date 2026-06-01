/* Facade pattern: this hides the full complexity of creating a submission —
   deadline checking, SHA-256 receipt generation, binary file storage in
   Neon PostgreSQL, and firing the Observer event — behind a single
   SubmissionService.create() call. Routes stay clean and simple; they
   never need to know about crypto, BYTEA inserts, or event buses.
   The same facade also wraps every query the system makes against the
   submissions table so that SQL never leaks into route handlers. */

const crypto = require('crypto');
const Database = require('./db');
const DeadlineService = require('./DeadlineService');

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
      original_filename VARCHAR(255),
      mime_type         VARCHAR(100),
      file_data         BYTEA,
      status            VARCHAR(20) DEFAULT 'ON_TIME',
      message           TEXT,
      submitted_at      TIMESTAMP DEFAULT NOW()
    )
  `);
  const migrations = [
    'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS full_name         VARCHAR(200)',
    'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS student_number    VARCHAR(50)',
    'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255)',
    'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS mime_type         VARCHAR(100)',
    'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS file_data         BYTEA',
  ];
  for (const sql of migrations) {
    await Database.query(sql).catch(() => {});
  }
  console.log('[DB] OK - submissions table ready');
}
initTable().catch(err => console.error('[DB] submissions init error:', err.message));


class SubmissionService {

  static async create(data, eventBus) {
    const {
      studentId, studentName, courseId,
      fullName, studentNumber,
      fileBuffer, originalFilename, mimeType,
    } = data;

    if (!courseId)        throw new Error('Course ID is required');
    if (!fullName)        throw new Error('Full name is required');
    if (!studentNumber)   throw new Error('Student ID number is required');
    if (!fileBuffer)      throw new Error('File is required');

    let status = 'ON_TIME';
    let message = 'Assignment received on time. Official digital receipt issued.';
    const deadline = await DeadlineService.getForCourse(courseId);
    if (deadline && new Date() > new Date(deadline.deadline_at)) {
      status  = 'LATE';
      message = 'Assignment received AFTER the deadline. Receipt issued but submission is late.';
    }

    const receiptId = 'RCT-' + crypto
      .createHash('sha256')
      .update(`${studentId}${courseId}${originalFilename}${Date.now()}`)
      .digest('hex')
      .substring(0, 12)
      .toUpperCase();

    const result = await Database.query(
      `INSERT INTO submissions
         (receipt_id, student_id, student_name, course_id, full_name,
          student_number, original_filename, mime_type, file_data, status, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, receipt_id, student_id, student_name, course_id,
                 full_name, student_number, original_filename, mime_type,
                 status, message, submitted_at`,
      [receiptId, studentId, studentName, courseId, fullName,
       studentNumber, originalFilename, mimeType, fileBuffer, status, message]
    );

    const submission = result.rows[0];

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

  static async getAll() {
    const result = await Database.query(
      `SELECT id, receipt_id, student_id, student_name, course_id,
              full_name, student_number, original_filename, mime_type,
              status, message, submitted_at
       FROM submissions ORDER BY submitted_at DESC`
    );
    return result.rows;
  }

  static async getForStudent(studentId) {
    const result = await Database.query(
      `SELECT id, receipt_id, student_id, student_name, course_id,
              full_name, student_number, original_filename, mime_type,
              status, message, submitted_at
       FROM submissions WHERE student_id=$1 ORDER BY submitted_at DESC`,
      [studentId]
    );
    return result.rows;
  }

  static async getByReceiptIdWithFile(receiptId) {
    const result = await Database.query(
      'SELECT * FROM submissions WHERE receipt_id=$1',
      [receiptId]
    );
    return result.rows[0] || null;
  }

  static async getByReceiptId(receiptId) {
    const result = await Database.query(
      `SELECT id, receipt_id, student_id, student_name, course_id,
              full_name, student_number, original_filename, mime_type,
              status, message, submitted_at
       FROM submissions WHERE receipt_id=$1`,
      [receiptId]
    );
    return result.rows[0] || null;
  }

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

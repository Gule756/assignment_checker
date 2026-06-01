/* Facade pattern: this hides the SQL UPSERT complexity for course deadlines
   behind four simple methods — set, getAll, getForCourse, and remove. Route
   handlers and SubmissionService call these methods without knowing anything
   about the deadlines table structure or the ON CONFLICT clause needed to
   update an existing deadline. If the storage mechanism changes, only this
   file needs to be updated. */

const Database = require('./db');

async function initTable() {
  await Database.query(`
    CREATE TABLE IF NOT EXISTS deadlines (
      id          SERIAL PRIMARY KEY,
      course_id   VARCHAR(50) UNIQUE NOT NULL,
      title       VARCHAR(200),
      deadline_at TIMESTAMP NOT NULL,
      teacher_id  INTEGER NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('[DB] OK - deadlines table ready');
}
initTable().catch(err => console.error('[DB] deadlines init error:', err.message));

class DeadlineService {

  static async set({ courseId, title, deadlineAt, teacherId }) {
    const result = await Database.query(
      `INSERT INTO deadlines (course_id, title, deadline_at, teacher_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (course_id)
       DO UPDATE SET title=$2, deadline_at=$3, teacher_id=$4
       RETURNING *`,
      [courseId, title || courseId + ' Deadline', deadlineAt, teacherId]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await Database.query(
      'SELECT * FROM deadlines ORDER BY deadline_at ASC'
    );
    return result.rows;
  }

  static async getForCourse(courseId) {
    const result = await Database.query(
      'SELECT * FROM deadlines WHERE course_id=$1',
      [courseId]
    );
    return result.rows[0] || null;
  }

  static async remove(courseId) {
    await Database.query('DELETE FROM deadlines WHERE course_id=$1', [courseId]);
  }
}

module.exports = DeadlineService;

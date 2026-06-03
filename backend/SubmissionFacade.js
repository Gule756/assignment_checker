const crypto = require('crypto');
const SubmissionService = require('./SubmissionService');
const DeadlineService = require('./DeadlineService');

class SubmissionFacade {
  static async createSubmission(data, eventBus) {
    const {
      studentId,
      studentName,
      courseId,
      fullName,
      studentNumber,
      fileBuffer,
      originalFilename,
      mimeType,
    } = data;

    if (!courseId)      throw new Error('Course ID is required');
    if (!fullName)      throw new Error('Full name is required');
    if (!studentNumber) throw new Error('Student ID number is required');
    if (!fileBuffer)    throw new Error('File is required');

    let status = 'ON_TIME';
    let message = 'Assignment received on time. Official digital receipt issued.';
    const deadline = await DeadlineService.getForCourse(courseId);
    if (deadline && new Date() > new Date(deadline.deadline_at)) {
      status = 'LATE';
      message = 'Assignment received AFTER the deadline. Receipt issued but submission is late.';
    }

    const receiptId = 'RCT-' + crypto
      .createHash('sha256')
      .update(`${studentId}${courseId}${originalFilename}${Date.now()}`)
      .digest('hex')
      .substring(0, 12)
      .toUpperCase();

    const submission = await SubmissionService.insertSubmission({
      receiptId,
      studentId,
      studentName,
      courseId,
      fullName,
      studentNumber,
      originalFilename,
      mimeType,
      fileBuffer,
      status,
      message,
    });

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

  static async getAllSubmissions() {
    return SubmissionService.getAll();
  }

  static async getSubmissionsForStudent(studentId) {
    return SubmissionService.getForStudent(studentId);
  }

  static async getSubmissionByReceiptId(receiptId) {
    return SubmissionService.getByReceiptId(receiptId);
  }

  static async getSubmissionWithFile(receiptId) {
    return SubmissionService.getByReceiptIdWithFile(receiptId);
  }

  static async getStats() {
    return SubmissionService.getStats();
  }
}

module.exports = SubmissionFacade;

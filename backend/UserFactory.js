/**
 * ================================================================
 *  UserFactory.js — Factory Method Pattern
 * ================================================================
 *  Pattern : FACTORY METHOD (Creational GoF)
 *  Intent  : Define an interface for creating objects but let the
 *            factory decide which class to instantiate.
 *
 *  Produces: StudentUser | TeacherUser  from a database row.
 * ================================================================
 */

class StudentUser {
  constructor(row) {
    this.id    = row.id;
    this.name  = row.name;
    this.email = row.email;
    this.role  = 'student';
  }
  canViewAll()      { return false; }
  canDownload()     { return false; }
  toPublic() {
    return { id: this.id, name: this.name, email: this.email, role: this.role };
  }
}

class TeacherUser {
  constructor(row) {
    this.id    = row.id;
    this.name  = row.name;
    this.email = row.email;
    this.role  = 'teacher';
  }
  canViewAll()      { return true; }   // teachers see every submission
  canDownload()     { return true; }   // teachers can open file links
  toPublic() {
    return { id: this.id, name: this.name, email: this.email, role: this.role };
  }
}

class UserFactory {
  /**
   * Factory Method: returns the correct user object.
   * @param {Object} row - DB row with { id, name, email, role }
   * @returns {StudentUser|TeacherUser}
   */
  static create(row) {
    if (!row) throw new Error('[UserFactory] Cannot create user from null row');
    if (row.role === 'teacher') return new TeacherUser(row);
    return new StudentUser(row);
  }
}

module.exports = { UserFactory, StudentUser, TeacherUser };

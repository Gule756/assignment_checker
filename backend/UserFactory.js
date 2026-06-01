/* Factory Method pattern: UserFactory.create() decides which class to
   instantiate — StudentUser or TeacherUser — based on the role field in
   the database row. The rest of the code never writes "new StudentUser"
   directly; it always calls the factory. That means adding a new role
   later only requires a new class and one line inside create(), with no
   changes anywhere else in the system. */

class StudentUser {
  constructor(row) {
    this.id    = row.id;
    this.name  = row.name;
    this.email = row.email;
    this.role  = 'student';
  }
  canViewAll()  { return false; }
  canDownload() { return false; }
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
  canViewAll()  { return true; }
  canDownload() { return true; }
  toPublic() {
    return { id: this.id, name: this.name, email: this.email, role: this.role };
  }
}

class UserFactory {
  static create(row) {
    if (!row) throw new Error('[UserFactory] Cannot create user from null row');
    if (row.role === 'teacher') return new TeacherUser(row);
    return new StudentUser(row);
  }
}

module.exports = { UserFactory, StudentUser, TeacherUser };

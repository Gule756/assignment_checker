/* Singleton pattern: this ensures only one PostgreSQL connection pool is
   ever created for the entire backend. The first call to Database.getInstance()
   builds the Pool and stores it; every call after that — from SubmissionService,
   DeadlineService, or any route — returns the same object. That keeps connection
   count low and means no module can accidentally open a second pool. */

const { Pool } = require('pg');

const DB_URL = "postgresql://neondb_owner:npg_W6prk0ZMIwTo@ep-restless-art-aq3ps5h0-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";

class Database {
  static getInstance() {
    if (!Database._instance) {
      Database._instance = new Pool({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
      });
      console.log('[Database] Singleton pool created');

      Database._instance.on('error', (err) => {
        console.error('[Database] Pool error:', err.message);
      });
    }
    return Database._instance;
  }

  static async query(sql, params = []) {
    return Database.getInstance().query(sql, params);
  }
}

Database._instance = null;
module.exports = Database;

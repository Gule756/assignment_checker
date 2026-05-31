/**
 * ================================================================
 *  db.js — Singleton Pattern: PostgreSQL Connection Pool
 * ================================================================
 *  Pattern : SINGLETON (Creational GoF)
 *  Intent  : Ensure ONE Pool instance is ever created. All modules
 *            call Database.getInstance() and share the same pool.
 * ================================================================
 */
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
      console.log('[Database] ✔ Singleton pool created');

      Database._instance.on('error', (err) => {
        console.error('[Database] Pool error:', err.message);
      });
    }
    return Database._instance;
  }

  /** Convenience: run a query against the singleton pool */
  static async query(sql, params = []) {
    return Database.getInstance().query(sql, params);
  }
}

Database._instance = null;
module.exports = Database;

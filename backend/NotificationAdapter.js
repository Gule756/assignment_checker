/**
 * ================================================================
 *  NotificationAdapter.js — Adapter Pattern
 * ================================================================
 *  Pattern : ADAPTER (Structural GoF)
 *  Intent  : Convert the interface of the Python notification service
 *            (HTTP REST) into the interface that the Node.js Observer
 *            (EventEmitter) expects — a simple callback function.
 *
 *  Without Adapter:
 *    server.js would need to know about HTTP, Python port, JSON format.
 *
 *  With Adapter:
 *    server.js just calls notificationAdapter.send(data) — it doesn't
 *    know or care that Python is on the other end.
 *
 *  Participants (GoF):
 *    Target   → notify(data) callback interface (what Observer needs)
 *    Adaptee  → Python /auth/notify HTTP endpoint
 *    Adapter  → NotificationAdapter (this class)
 * ================================================================
 */
const http = require('http');

const PYTHON_HOST = 'localhost';
const PYTHON_PORT = 5001;

class NotificationAdapter {
  /**
   * Adapter method: translates a submission object into
   * an HTTP POST request to the Python notification service.
   *
   * Called by the Observer (EventEmitter listener in server.js).
   *
   * @param {Object} submissionData
   */
  send(submissionData) {
    const body = JSON.stringify(submissionData);

    const options = {
      hostname: PYTHON_HOST,
      port:     PYTHON_PORT,
      path:     '/auth/notify',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 3000,
    };

    const req = http.request(options, (res) => {
      console.log(`[NotificationAdapter] ✔ Python notifier responded: ${res.statusCode}`);
    });

    req.on('error', () => {
      // Python service offline — log and continue; never block submission flow
      console.log('[NotificationAdapter] ⚠ Python notifier offline — notification skipped');
    });

    req.on('timeout', () => req.destroy());

    req.write(body);
    req.end();
  }
}

module.exports = new NotificationAdapter(); // export a ready-to-use instance

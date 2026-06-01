/* Adapter pattern: this translates the Node.js Observer's simple send(data)
   call into the Python Flask notification service's HTTP POST contract, and
   absorbs any response or failure back from Python without exposing those
   details to the rest of the app. That lets the Observer and every other
   module use one simple interface even if the Python service URL, port,
   or request format changes later. */

const http = require('http');

const PYTHON_HOST = 'localhost';
const PYTHON_PORT = 5001;

class NotificationAdapter {
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
      console.log(`[NotificationAdapter] Python notifier responded: ${res.statusCode}`);
    });

    req.on('error', () => {
      console.log('[NotificationAdapter] Python notifier offline — notification skipped');
    });

    req.on('timeout', () => req.destroy());

    req.write(body);
    req.end();
  }
}

module.exports = new NotificationAdapter();

/**
 * ================================================================
 *  ReceiptDisplay — Receipt Rendering Component (Browser JS)
 * ================================================================
 *  Responsibility:
 *    Renders the official digital receipt card into the DOM after
 *    a successful submission. Handles all three status types
 *    (ON_TIME, LATE, REJECTED) with distinct visual styles.
 *
 *  Design note:
 *    This class follows the Single Responsibility Principle —
 *    it only handles display logic, nothing about submission logic.
 * ================================================================
 */
class ReceiptDisplay {

  /**
   * @param {string} containerId - ID of the DOM element to render into
   */
  constructor(containerId) {
    this._container = document.getElementById(containerId);
    if (!this._container) {
      console.error(`[ReceiptDisplay] Container #${containerId} not found.`);
    }
  }

  /**
   * Render a successful receipt card.
   *
   * @param {Object}  receipt
   * @param {boolean} isOffline - true when engine is unreachable
   */
  show(receipt, isOffline = false) {
    const statusMeta = {
      ON_TIME:  { cls: 'on-time',  icon: '🎓', label: 'ON TIME',  banner: '' },
      LATE:     { cls: 'late',     icon: '⏰', label: 'LATE',     banner: '' },
      REJECTED: { cls: 'rejected', icon: '🚫', label: 'REJECTED', banner: '' },
    };
    const meta = statusMeta[receipt.status] || statusMeta['ON_TIME'];

    const hashDisplay = receipt.assignmentHash.length > 36
      ? receipt.assignmentHash.substring(0, 36) + '…'
      : receipt.assignmentHash;

    const timestamp = new Date(receipt.timestamp).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'short',
    });

    this._container.innerHTML = `
      <div class="receipt-card receipt-${meta.cls} animate-slide-up" role="region" aria-label="Submission Receipt">

        ${isOffline ? `
          <div class="offline-banner" role="alert">
            📡 OFFLINE MODE — Engine unavailable. This is a local receipt only.
          </div>` : ''}

        <div class="receipt-header">
          <div class="receipt-icon" aria-hidden="true">${meta.icon}</div>
          <div class="receipt-header-text">
            <h2>Official Digital Receipt</h2>
            <p class="receipt-subtitle">Assignment Submission Confirmation</p>
          </div>
          <span class="status-pill status-${meta.cls}" aria-label="Status: ${meta.label}">
            ${meta.label}
          </span>
        </div>

        <div class="receipt-divider"></div>

        <dl class="receipt-fields">
          <div class="receipt-field">
            <dt>Receipt ID</dt>
            <dd class="mono" id="receipt-id-value">${receipt.receiptId}</dd>
          </div>
          <div class="receipt-field">
            <dt>Student ID</dt>
            <dd>${receipt.studentId}</dd>
          </div>
          <div class="receipt-field">
            <dt>Course</dt>
            <dd>${receipt.courseId}</dd>
          </div>
          <div class="receipt-field">
            <dt>Assignment Hash</dt>
            <dd class="mono hash-value" title="${receipt.assignmentHash}">${hashDisplay}</dd>
          </div>
          <div class="receipt-field">
            <dt>Issued At</dt>
            <dd>${timestamp}</dd>
          </div>
        </dl>

        <div class="receipt-message receipt-message-${meta.cls}">
          ${receipt.message}
        </div>

        <div class="receipt-actions">
          <button
            class="btn btn-copy"
            id="btn-copy-receipt"
            onclick="
              navigator.clipboard.writeText('${receipt.receiptId}')
                .then(() => { this.textContent = '✅ Copied!'; setTimeout(() => this.textContent = '📋 Copy Receipt ID', 2000); })
                .catch(() => this.textContent = '❌ Copy failed');
            ">
            📋 Copy Receipt ID
          </button>
          <button class="btn btn-new" id="btn-new-submission" onclick="document.getElementById('submission-form').reset(); document.getElementById('receipt-container').innerHTML = ''; document.getElementById('hash-feedback').textContent = ''; document.getElementById('assignmentHash').dispatchEvent(new Event('input'));">
            ＋ New Submission
          </button>
        </div>
      </div>
    `;

    // Smooth scroll to receipt
    this._container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Render a validation / network error card.
   * @param {string} message
   */
  showError(message) {
    this._container.innerHTML = `
      <div class="error-card animate-slide-up" role="alert">
        <div class="error-icon" aria-hidden="true">❌</div>
        <h3>Submission Failed</h3>
        <p>${message}</p>
        <p class="error-hint">Please check your inputs and try again.</p>
      </div>
    `;
  }

  /**
   * Clear any rendered receipt or error.
   */
  clear() {
    if (this._container) this._container.innerHTML = '';
  }
}

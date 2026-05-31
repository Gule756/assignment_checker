/**
 * ================================================================
 *  SubmissionRenderer — Grid Rendering Component (Browser JS)
 * ================================================================
 *  Responsibility:
 *    Renders a filtered list of submissions as a styled HTML table
 *    inside the gradebook dashboard. Handles the empty state.
 *
 *  Design note (Single Responsibility Principle):
 *    This class only builds HTML strings and injects them into the
 *    DOM. It has zero knowledge of filtering, fetching, or exporting.
 * ================================================================
 */
class SubmissionRenderer {

  /**
   * @param {string} containerId - ID of the table wrapper element
   */
  constructor(containerId) {
    this._container = document.getElementById(containerId);
  }

  /**
   * Render the submissions grid.
   * @param {Object[]} submissions - already-filtered list
   */
  render(submissions) {
    if (!this._container) return;

    if (submissions.length === 0) {
      this._container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon" aria-hidden="true">📭</div>
          <h3>No submissions found</h3>
          <p>Try adjusting your filters or refreshing to load the latest data.</p>
        </div>`;
      return;
    }

    this._container.innerHTML = `
      <div class="table-wrapper" role="region" aria-label="Submissions table" tabindex="0">
        <table class="submissions-table" id="submissions-table">
          <thead>
            <tr>
              <th scope="col" class="col-num">#</th>
              <th scope="col" class="col-receipt">Receipt ID</th>
              <th scope="col" class="col-student">Student ID</th>
              <th scope="col" class="col-course">Course</th>
              <th scope="col" class="col-hash">Hash (preview)</th>
              <th scope="col" class="col-status">Status</th>
              <th scope="col" class="col-time">Submitted At</th>
            </tr>
          </thead>
          <tbody>
            ${submissions.map((s, i) => this._renderRow(s, i + 1)).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /**
   * Build a single table row for one submission record.
   * @private
   */
  _renderRow(s, index) {
    const statusMap = {
      ON_TIME:  { cls: 'on-time',  label: 'On Time'  },
      LATE:     { cls: 'late',     label: 'Late'      },
      REJECTED: { cls: 'rejected', label: 'Rejected'  },
    };
    const status = statusMap[s.status] || { cls: 'unknown', label: s.status };

    const hashPreview = (s.assignmentHash || 'N/A').substring(0, 20) + '…';
    const timestamp   = new Date(s.timestamp).toLocaleString(undefined, {
      year:'numeric', month:'short', day:'numeric',
      hour:'2-digit', minute:'2-digit',
    });

    return `
      <tr class="table-row row-${status.cls}">
        <td class="col-num">${index}</td>
        <td class="col-receipt">
          <span class="receipt-id" title="${s.receiptId}">${s.receiptId}</span>
        </td>
        <td class="col-student">
          <span class="student-id">${s.studentId || '—'}</span>
        </td>
        <td class="col-course">
          <span class="course-badge">${s.courseId || '—'}</span>
        </td>
        <td class="col-hash">
          <span class="hash-preview" title="${s.assignmentHash}">${hashPreview}</span>
        </td>
        <td class="col-status">
          <span class="status-badge status-${status.cls}" aria-label="Status: ${status.label}">
            ${status.label}
          </span>
        </td>
        <td class="col-time">${timestamp}</td>
      </tr>`;
  }

  /**
   * Show a loading skeleton while data is being fetched.
   */
  showLoading() {
    if (!this._container) return;
    this._container.innerHTML = `
      <div class="loading-state">
        <div class="spinner-ring-lg" aria-hidden="true"></div>
        <p>Loading submissions…</p>
      </div>`;
  }
}

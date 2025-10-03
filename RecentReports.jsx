import React from 'react';
import { Link } from 'react-router-dom';

const statusVariant = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'submitted':
      return 'warning';
    default:
      return 'secondary';
  }
};

const RecentReports = ({ reports = [] }) => (
  <div className="card mb-3">
    <div className="card-header d-flex align-items-center">
      <i className="bi bi-clock-history me-2"></i>
      Recent Reports
    </div>
    <div className="card-body">
      {!Array.isArray(reports) || reports.length === 0 ? (
        <div className="text-muted">No recent reports</div>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="d-flex align-items-center py-2 border-bottom">
            {/* Avatar */}
            <div className="me-3">
              <div className="avatar-circle bg-primary text-white d-inline-flex align-items-center justify-content-center">
                <i className="bi bi-file-earmark-text"></i>
              </div>
            </div>
            {/* Content */}
            <div className="flex-grow-1">
              <div className="fw-semibold d-flex align-items-center gap-2">
                <Link to={`/reports/${r.id}`} className="text-decoration-none">{r.title || 'Untitled report'}</Link>
                {(r.status || '').toLowerCase() === 'draft' && (
                  <span className="badge bg-secondary">Draft</span>
                )}
                {(r.status || '').toLowerCase() === 'reviewed' && (
                  <span className="badge bg-info text-dark">Reviewed</span>
                )}
                {(r.status || '').toLowerCase() === 'submitted' && (
                  <span className="badge bg-warning text-dark">Submitted</span>
                )}
                {(r.status || '').toLowerCase() === 'approved' && (
                  <span className="badge bg-success">Approved</span>
                )}
                {(r.status || '').toLowerCase() === 'rejected' && (
                  <span className="badge bg-danger">Rejected</span>
                )}
              </div>
              <div className="text-muted small">
                {r.course_name ? r.course_name : 'General'}
              </div>
            </div>
            {/* Meta */}
            <div className="d-flex align-items-center gap-3">
              {r.status && (r.status || '').toLowerCase() !== 'draft' && (
                <span className={`badge bg-${statusVariant(r.status)}`}>{r.status}</span>
              )}
              {r.created_at && (
                <small className="text-muted">{new Date(r.created_at).toLocaleDateString()}</small>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export default RecentReports;

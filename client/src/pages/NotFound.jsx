import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
      <div className="text-center" style={{ maxWidth: 560 }}>
        <div className="card-modern p-4 mb-3">
          <div className="display-3 fw-bold" style={{
            background: 'linear-gradient(135deg, var(--brand), #6f42c1)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>404</div>
          <h3 className="fw-semibold">Page not found</h3>
          <p className="text-muted mb-4">The page you are looking for doesn't exist or has been moved.</p>
          <div className="d-flex gap-2 justify-content-center">
            <Link to="/" className="btn btn-primary">
              <i className="bi bi-house-door me-2"></i>
              Go Home
            </Link>
            <Link to="/reports" className="btn btn-outline-secondary">
              <i className="bi bi-file-text me-2"></i>
              View Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

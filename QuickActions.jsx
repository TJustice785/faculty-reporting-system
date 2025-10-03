import React from 'react';
import { Link } from 'react-router-dom';

const QuickActions = ({ userRole }) => (
  <div className="card mb-3">
    <div className="card-header">Quick Actions</div>
    <div className="card-body">
      <div className="quick-tiles">
        {userRole !== 'student' ? (
          <Link to="/reports/lecturer/new" className="tile tile-primary">
            <i className="bi bi-journal-plus"></i>
            <div>
              <div className="tile-title">New Lecturer Report</div>
              <div className="tile-sub">Submit your lecture details</div>
            </div>
          </Link>
        ) : (
          <Link to="/reports/create" className="tile tile-primary">
            <i className="bi bi-plus-circle"></i>
            <div>
              <div className="tile-title">Create Report</div>
              <div className="tile-sub">Start a new submission</div>
            </div>
          </Link>
        )}

        <Link to="/reports" className="tile tile-secondary">
          <i className="bi bi-file-text"></i>
          <div>
            <div className="tile-title">My Reports</div>
            <div className="tile-sub">View and manage</div>
          </div>
        </Link>

        {userRole === 'student' && (
          <Link to="/my-progress" className="tile tile-success">
            <i className="bi bi-graph-up-arrow"></i>
            <div>
              <div className="tile-title">My Progress</div>
              <div className="tile-sub">Performance insights</div>
            </div>
          </Link>
        )}
      </div>
    </div>
  </div>
);

export default QuickActions;

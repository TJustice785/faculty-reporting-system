import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

export default function PendingActions() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  const { data, isLoading, error, refetch } = useQuery(
    ['pending-actions', page, limit],
    async () => {
      const res = await apiService.dashboard.getPending({ page, limit });
      return res?.data ?? res;
    },
    { keepPreviousData: true, refetchOnWindowFocus: false }
  );

  const items = data?.items || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0, limit };

  const handleModerate = async (id, update) => {
    try {
      await apiService.reports.moderate(id, update);
      toast.success('Updated');
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to update');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0"><i className="bi bi-inbox me-2"></i>Pending Actions</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => refetch()} disabled={isLoading}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <Link to="/reports" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-file-text me-1"></i> Reports
          </Link>
        </div>
      </div>

      <Card>
        <Card.Body className="p-0">
          {isLoading && (
            <div className="text-center py-5 text-muted">Loading...</div>
          )}
          {error && (
            <div className="alert alert-danger m-3">{error?.response?.data?.error || 'Failed to load pending actions'}</div>
          )}
          {!isLoading && !error && items.length === 0 && (
            <div className="text-center py-5 text-muted">No pending items.</div>
          )}
          {!isLoading && !error && items.length > 0 && (
            <>
              <Table responsive hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Title</th>
                    <th>Reporter</th>
                    <th>Course</th>
                    <th>Type</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <div className="fw-semibold">{it.title}</div>
                      </td>
                      <td>
                        {it.first_name} {it.last_name}
                        <div className="text-muted small">{String(it.reporter_role).replace('_',' ')}</div>
                      </td>
                      <td>{it.course_name || 'N/A'}</td>
                      <td>{String(it.report_type).replace('_',' ')}</td>
                      <td>
                        <div>{new Date(it.created_at).toLocaleDateString()}</div>
                        <small className="text-muted">{new Date(it.created_at).toLocaleTimeString()}</small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Link to={`/reports/${it.id}`} className="btn btn-sm btn-outline-primary" title="View">
                            <i className="bi bi-eye"></i>
                          </Link>
                          <button className="btn btn-sm btn-outline-success" onClick={() => handleModerate(it.id, { status: 'approved' })} title="Approve">
                            <i className="bi bi-check2-circle"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleModerate(it.id, { status: 'reviewed' })} title="Mark Reviewed">
                            <i className="bi bi-eye"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleModerate(it.id, { status: 'rejected' })} title="Reject">
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="p-3 border-top d-flex align-items-center justify-content-between">
                <div className="text-muted small">
                  Page {pagination.page} of {pagination.pages} • {pagination.total} total
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button className="btn btn-sm btn-outline-secondary" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                  <button className="btn btn-sm btn-outline-secondary" disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}>Next</button>
                  <select className="form-select form-select-sm ms-2" style={{ width: 120 }} value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

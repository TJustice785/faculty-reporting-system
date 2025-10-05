import React from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

export default function AuditLogs() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(25);
  const [action, setAction] = React.useState('');
  const [q, setQ] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const { data, isLoading, error, refetch } = useQuery(
    ['admin-audit', page, limit, action, q, startDate, endDate],
    async () => {
      const params = { page, limit };
      if (action) params.action = action;
      if (q) params.q = q;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiService.admin.getAudit(params);
      return res?.data ?? res;
    },
    { keepPreviousData: true, refetchOnWindowFocus: false }
  );

  const logs = data?.logs || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0, limit };

  const exportCsv = () => {
    const headers = ['When','User','Email','Action','TargetType','TargetIds','Meta'];
    const rows = logs.map(l => [
      l.created_at,
      l.username || `User #${l.user_id}`,
      l.email || '',
      l.action,
      l.target_type,
      Array.isArray(l.target_ids) ? l.target_ids.join('|') : String(l.target_ids),
      l.meta ? JSON.stringify(l.meta) : '{}',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => '"' + String(v).replaceAll('"','""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0"><i className="bi bi-clipboard-data me-2"></i>Audit Logs</h2>
        <div className="d-flex gap-2">
          <input className="form-control form-control-sm" style={{maxWidth: 220}} placeholder="Search user/email"
                 value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
          <select className="form-select form-select-sm" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            <option value="activate">activate</option>
            <option value="deactivate">deactivate</option>
            <option value="delete">delete</option>
            <option value="setRole">setRole</option>
          </select>
          <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
          <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
          <button className="btn btn-sm btn-outline-secondary" onClick={() => refetch()} disabled={isLoading}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button className="btn btn-sm btn-outline-primary" onClick={exportCsv} disabled={isLoading || logs.length === 0}>
            <i className="bi bi-download me-1"></i> Export CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-sm table-striped mb-0">
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>Meta</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="text-center py-4 text-muted">Loading...</td></tr>
              )}
              {error && (
                <tr><td colSpan={5} className="text-danger">{error?.response?.data?.error || 'Failed to load audit logs'}</td></tr>
              )}
              {!isLoading && !error && logs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-4 text-muted">No audit logs found.</td></tr>
              )}
              {!isLoading && !error && logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div>{new Date(log.created_at).toLocaleDateString()}</div>
                    <div className="text-muted small">{new Date(log.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td>
                    <div className="fw-semibold">{log.username || 'User #' + log.user_id}</div>
                    <div className="text-muted small">{log.email || ''}</div>
                  </td>
                  <td><span className="badge bg-secondary text-uppercase">{String(log.action)}</span></td>
                  <td>
                    <div className="small text-muted">{log.target_type}</div>
                    <div className="fw-semibold">{Array.isArray(log.target_ids) ? log.target_ids.join(', ') : String(log.target_ids)}</div>
                  </td>
                  <td className="small">
                    <code>{log.meta ? JSON.stringify(log.meta) : '{}'}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between">
            <div className="text-muted small">Page {pagination.page} of {pagination.pages} • {pagination.total} total</div>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-secondary" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}>Next</button>
              <select className="form-select form-select-sm ms-2" style={{ width: 120 }} value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

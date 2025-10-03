import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

export default function Notifications() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(15);
  const { data, isLoading, error, refetch } = useQuery(
    ['notifications-page', page, limit],
    async () => {
      const res = await apiService.dashboard.getNotifications({ page, limit });
      return res?.data ?? res;
    },
    { refetchInterval: 30000 }
  );

  const notifications = data?.notifications || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0, limit };
  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (type, id) => {
    try {
      await apiService.dashboard.markNotificationRead(type, id);
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await apiService.dashboard.markAllNotificationsRead();
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to mark all as read');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0"><i className="bi bi-bell me-2"></i>Notifications</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => refetch()} disabled={isLoading}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button className="btn btn-sm btn-outline-success" onClick={markAllRead} disabled={isLoading || (unreadCount === 0 && (data?.pagination?.total || 0) === 0)}>
            <i className="bi bi-check2-all me-1"></i> Mark all read
          </button>
          <Link to="/" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-speedometer2 me-1"></i> Dashboard
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {isLoading && <div className="text-muted">Loading notifications...</div>}
          {error && (
            <div className="alert alert-danger">
              {error?.response?.data?.error || 'Failed to load notifications'}
            </div>
          )}

          {!isLoading && !error && notifications.length === 0 && (
            <div className="text-muted">No notifications found.</div>
          )}

          {!isLoading && !error && notifications.length > 0 && (
            <div className="list-group list-group-flush">
              {notifications.map((n) => (
                <div key={`${n.type}-${n.id}`} className={`list-group-item d-flex align-items-start gap-3 ${!n.read ? 'bg-light' : ''}`}>
                  <div className="text-primary">
                    {n.type === 'feedback' ? (
                      <i className="bi bi-chat-left-text"></i>
                    ) : (
                      <i className="bi bi-file-earmark-text"></i>
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold">{n.title || 'Notification'}</div>
                    <div className="text-muted small">{n.message}</div>
                  </div>
                  <div className="text-nowrap small text-muted">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                  </div>
                  {!n.read && (
                    <div>
                      <button className="btn btn-sm btn-outline-success" onClick={() => markRead(n.type, n.id)} title="Mark as read">
                        <i className="bi bi-check2"></i>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {pagination.pages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between">
            <div className="text-muted small">
              Page {pagination.page} of {pagination.pages} • {pagination.total} total
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              >
                Next
              </button>
              <select
                className="form-select form-select-sm ms-2"
                style={{ width: 120 }}
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

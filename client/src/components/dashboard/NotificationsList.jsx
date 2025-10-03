import React from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const NotificationsList = () => {
  const { data, isLoading, error, refetch, isFetching } = useQuery(
    'dashboard-notifications',
    async () => {
      const res = await apiService.dashboard.getNotifications();
      return res?.data ?? res;
    },
    {
      refetchInterval: 30000,
    }
  );

  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    try {
      await apiService.dashboard.markAllNotificationsRead();
      await refetch();
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to mark all as read');
    }
  };

  return (
    <div className="card">
      <div className="card-header d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="badge bg-danger" title="Unread">{unreadCount}</span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-secondary" title="Total shown">{notifications.length}</span>
          <button className="btn btn-sm btn-outline-success" onClick={markAllRead} disabled={isLoading || isFetching || unreadCount === 0}>
            <i className="bi bi-check2-all"></i>
          </button>
          <Link to="/notifications" className="btn btn-sm btn-outline-primary">
            View all
          </Link>
        </div>
      </div>
      <div className="card-body">
        {isLoading && <div className="text-muted">Loading notifications...</div>}
        {error && (
          <div className="alert alert-danger">
            {error?.response?.data?.error || 'Failed to load notifications'}
          </div>
        )}
        {!isLoading && !error && notifications.length === 0 && (
          <div className="text-muted">No notifications.</div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsList;

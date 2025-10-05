import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { apiService, downloadFile } from '../../services/api';
import './AdminDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

function StatCard({ title, value, subtitle }) {
  return (
    <div className="card shadow-sm h-100">
      <div className="card-body">
        <h6 className="text-muted mb-1">{title}</h6>
        <div className="display-6 fw-bold">{value ?? '-'}</div>
        {subtitle && <div className="text-secondary small mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, refetch } = useQuery(['admin-overview', days], async () => {
    const res = await apiService.admin.getOverview(days);
    return res?.data ?? res;
  }, { refetchInterval: 60000 });

  if (isLoading) return <div className="container py-4">Loading admin overview...</div>;
  if (isError) return <div className="container py-4 text-danger">Failed to load admin overview</div>;

  const users = data?.users || {};
  const reports = data?.reports || {};
  const streams = data?.streams || [];
  const topCourses = data?.topCourses || [];
  const recentUsers = data?.recentUsers || [];
  const trend = data?.reportTrend || [];

  // Build chart data
  const trendLabels = trend.map(t => new Date(t.day).toLocaleDateString());
  const trendCounts = trend.map(t => t.count);
  const trendData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Reports (last 30 days)',
        data: trendCounts,
        fill: true,
        borderColor: 'rgba(13,110,253,1)',
        backgroundColor: 'rgba(13,110,253,0.15)',
        tension: 0.25,
        pointRadius: 2,
      },
    ],
  };
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
  };

  const statusData = {
    labels: ['Draft', 'Submitted', 'Approved', 'Rejected'],
    datasets: [
      {
        data: [reports.drafts || 0, reports.submitted || 0, reports.approved || 0, reports.rejected || 0],
        backgroundColor: ['#6c757d', '#0d6efd', '#198754', '#dc3545'],
        borderWidth: 0,
      },
    ],
  };
  const statusOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

  const exportReportsExcel = async () => {
    try {
      const res = await apiService.export.reportsExcel({});
      downloadFile(res.data, `reports_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) { /* handled by interceptor toasts */ }
  };

  const exportUsersExcel = async () => {
    try {
      const res = await apiService.export.usersExcel({});
      downloadFile(res.data, `users_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) { /* handled by interceptor toasts */ }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Admin Dashboard</h2>
      <p className="text-secondary">System-wide overview for administrators</p>

      {/* Controls & Quick actions */}
      <div className="d-flex flex-wrap gap-2 mb-3 admin-controls">
        <select className="form-select form-select-sm" value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => refetch()}>
          Refresh
        </button>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/users')}>
          <i className="bi bi-people me-2"></i>Manage Users
        </button>
        <button type="button" className="btn btn-outline-primary" onClick={() => navigate('/analytics')}>
          <i className="bi bi-graph-up me-2"></i>View Analytics
        </button>
        <button type="button" className="btn btn-outline-success" onClick={exportReportsExcel}>
          <i className="bi bi-file-earmark-excel me-2"></i>Export Reports (Excel)
        </button>
        <button type="button" className="btn btn-outline-success" onClick={exportUsersExcel}>
          <i className="bi bi-file-earmark-excel me-2"></i>Export Users (Excel)
        </button>
      </div>

      {/* Top stats */}
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Total Users" value={users.total_users} subtitle={`${users.active_users || 0} active`} />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Reports" value={reports.total_reports} subtitle={`${reports.submitted || 0} submitted`} />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Lecturers" value={users.lecturers} subtitle={`${users.students || 0} students`} />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Streams" value={streams.length} subtitle="Active streams" />
        </div>
      </div>

      {/* Charts */}
      <div className="row g-3 mt-1">
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header fw-semibold">Reports Trend (30 days)</div>
            <div className="card-body" style={{ height: 280 }}>
              <Line data={trendData} options={trendOptions} />
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-header fw-semibold">Report Status</div>
            <div className="card-body" style={{ height: 280 }}>
              <Pie data={statusData} options={statusOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Streams overview */}
      <div className="card mt-4">
        <div className="card-header fw-semibold">Streams Overview</div>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>Stream</th>
                <th>Courses</th>
                <th>Students</th>
                <th>Lecturers</th>
              </tr>
            </thead>
            <tbody>
              {streams.map(s => (
                <tr key={s.id}>
                  <td>{s.stream_name}</td>
                  <td>{s.courses}</td>
                  <td>{s.students}</td>
                  <td>{s.lecturers}</td>
                </tr>
              ))}
              {streams.length === 0 && <tr><td colSpan={4} className="text-center text-muted">No streams</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top courses */}
      <div className="card mt-4">
        <div className="card-header fw-semibold">Top Courses</div>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>Course</th>
                <th>Code</th>
                <th>Enrolled</th>
                <th>Reports</th>
                <th>Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {topCourses.map(c => (
                <tr key={c.id}>
                  <td>{c.course_name}</td>
                  <td>{c.course_code}</td>
                  <td>{c.enrolled_students}</td>
                  <td>{c.report_count}</td>
                  <td>{c.avg_rating ? Number(c.avg_rating).toFixed(1) : '-'}</td>
                </tr>
              ))}
              {topCourses.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No courses</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent users */}
      <div className="card mt-4">
        <div className="card-header fw-semibold">Recent Users</div>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`admin-role-badge badge-role-${u.role}`}>{String(u.role).replace('_',' ')}</span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {recentUsers.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No users</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-secondary small mt-3">Last updated: {new Date(data?.generatedAt || Date.now()).toLocaleString()}</div>
    </div>
  );
}

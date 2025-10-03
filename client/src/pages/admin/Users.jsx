import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [showList, setShowList] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'student',
  });

  const roles = useMemo(() => (
    ['student', 'lecturer', 'program_leader', 'principal_lecturer', 'faculty_manager']
  ), []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiService.users.getAll();
      // Some backends return array directly, others wrap in { users }
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (e) {
      const message = e.response?.data?.error || 'Failed to fetch users';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Do not auto-load; wait until user opens the list
    if (showList && !loadedOnce) {
      (async () => {
        await loadUsers();
        setLoadedOnce(true);
      })();
    }
  }, [showList, loadedOnce]);

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    try {
      setCreating(true);
      await apiService.users.create(form);
      toast.success('User created');
      setForm({ username: '', email: '', password: '', firstName: '', lastName: '', role: 'student' });
      setAdding(false);
      await loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await apiService.users.update(id, { role });
      toast.success('Role updated');
      await loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update role');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      if (user.is_active === false) {
        await apiService.users.reactivate(user.id);
        toast.success('User reactivated');
      } else {
        await apiService.users.deactivate(user.id);
        toast.success('User deactivated');
      }
      await loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to toggle active');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiService.users.delete(id);
      toast.success('User deleted');
      await loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">Users Management</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => setShowList(v => !v)}>
            {showList ? 'Hide Users' : 'Show Users'}
          </button>
          <button className="btn btn-primary" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Close' : 'Add User'}
          </button>
        </div>
      </div>

      {adding && (
        <form className="card card-body mb-4" onSubmit={handleCreate}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Username</label>
              <input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">First Name</label>
              <input className="form-control" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Last Name</label>
              <input className="form-control" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button type="submit" className="btn btn-success" disabled={creating}>
              {creating ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      )}

      {showList && loading && <div className="py-5 text-center">Loading users…</div>}
      {showList && error && <div className="alert alert-danger">{error}</div>}

      {showList && !loading && !error && (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ width: 280 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{[u.firstName || u.first_name, u.lastName || u.last_name].filter(Boolean).join(' ')}</td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    {u.is_active === false ? (
                      <span className="badge bg-secondary">Inactive</span>
                    ) : (
                      <span className="badge bg-success">Active</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-warning" onClick={() => handleToggleActive(u)}>
                        {u.is_active === false ? 'Reactivate' : 'Deactivate'}
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

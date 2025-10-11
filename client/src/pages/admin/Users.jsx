import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [showList, setShowList] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [selected, setSelected] = useState([]);
  const [bulkRole, setBulkRole] = useState('student');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', firstName: '', lastName: '' });
  const [resettingId, setResettingId] = useState(null);
  const [tempPassword, setTempPassword] = useState('');

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
      // Reset selections when list refreshes
      setSelected([]);
    } catch (e) {
      const message = e.response?.data?.error || 'Failed to fetch users';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (id) => {
    if (!confirm('Generate a temporary password for this user? It will be shown once.')) return;
    try {
      setResettingId(id);
      const { data } = await apiService.users.resetPassword(id);
      setTempPassword(data?.tempPassword || '');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to reset password');
    } finally {
      setResettingId(null);
    }
  };

  const closeTempModal = () => setTempPassword('');
  const copyTemp = async () => {
    try { await navigator.clipboard.writeText(tempPassword); toast.success('Copied'); } catch { /* noop */ }
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

  const startEdit = (u) => {
    setEditId(u.id);
    setEditForm({
      username: u.username || '',
      email: u.email || '',
      firstName: u.firstName ?? u.first_name ?? '',
      lastName: u.lastName ?? u.last_name ?? '',
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({ username: '', email: '', firstName: '', lastName: '' });
  };

  const saveEdit = async (id) => {
    try {
      // Admin can update all fields, program_leader only names
      let payload;
      if (currentUser?.role === 'admin') {
        payload = {
          username: editForm.username,
          email: editForm.email,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          // also send snake_case for backends that expect it
          first_name: editForm.firstName,
          last_name: editForm.lastName,
        };
      } else {
        payload = {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          first_name: editForm.firstName,
          last_name: editForm.lastName,
        };
      }
      await apiService.users.update(id, payload);
      toast.success('User updated');
      cancelEdit();
      await loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update user');
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

      {/* Bulk tools (admin only) */}
      {showList && currentUser?.role === 'admin' && (
        <div className="card card-body mb-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="me-2">Bulk actions for {selected.length} selected:</span>
            <button className="btn btn-sm btn-outline-success" onClick={() => doBulk('activate')} disabled={selected.length === 0}>Activate</button>
            <button className="btn btn-sm btn-outline-warning" onClick={() => doBulk('deactivate')} disabled={selected.length === 0}>Deactivate</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => doBulk('delete')} disabled={selected.length === 0}>Delete</button>
            <div className="d-flex align-items-center gap-2 ms-2">
              <select className="form-select form-select-sm" value={bulkRole} onChange={e => setBulkRole(e.target.value)}>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="admin">admin</option>
              </select>
              <button className="btn btn-sm btn-outline-primary" onClick={() => doBulk('setRole')} disabled={selected.length === 0}>Set Role</button>
            </div>
          </div>
        </div>
      )}

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
                <th>
                  <input type="checkbox"
                         aria-label="Select all"
                         checked={selected.length > 0 && selected.length === users.length}
                         onChange={e => toggleAll(e.target.checked)} />
                </th>
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
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select user ${u.id}`}
                      checked={selected.includes(u.id)}
                      onChange={e => toggleOne(u.id, e.target.checked)}
                    />
                  </td>
                  <td>{u.id}</td>
                  <td>
                    {editId === u.id && currentUser?.role === 'admin' ? (
                      <input
                        className="form-control form-control-sm"
                        value={editForm.username}
                        onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                      />
                    ) : (
                      u.username
                    )}
                  </td>
                  <td>
                    {editId === u.id && currentUser?.role === 'admin' ? (
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    ) : (
                      u.email
                    )}
                  </td>
                  <td>
                    {editId === u.id && (currentUser?.role === 'admin' || currentUser?.role === 'program_leader') ? (
                      <div className="d-flex gap-2">
                        <input
                          className="form-control form-control-sm"
                          placeholder="First"
                          style={{ maxWidth: 140 }}
                          value={editForm.firstName}
                          onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                        />
                        <input
                          className="form-control form-control-sm"
                          placeholder="Last"
                          style={{ maxWidth: 140 }}
                          value={editForm.lastName}
                          onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                        />
                      </div>
                    ) : (
                      [u.firstName || u.first_name, u.lastName || u.last_name].filter(Boolean).join(' ')
                    )}
                  </td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={currentUser?.role === 'program_leader' && (u.role !== 'student' && u.role !== 'lecturer')}
                    >
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      <option value="admin">admin</option>
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
                      {((currentUser?.role === 'admin') || (currentUser?.role === 'program_leader' && (u.role === 'student' || u.role === 'lecturer'))) && (
                        editId === u.id ? (
                          <>
                            <button className="btn btn-sm btn-success" onClick={() => saveEdit(u.id)}>Save</button>
                            <button className="btn btn-sm btn-secondary" onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(u)}>Edit</button>
                        )
                      )}
                      {currentUser?.role === 'admin' && (
                        <button className="btn btn-sm btn-outline-dark" onClick={() => resetPassword(u.id)} disabled={resettingId === u.id}>
                          {resettingId === u.id ? 'Resetting…' : 'Reset Password'}
                        </button>
                      )}
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

      {/* Temporary password modal */}
      {tempPassword && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Temporary Password</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeTempModal}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning small">Shown once. Copy and share securely with the user.</div>
                <div className="input-group">
                  <input className="form-control" value={tempPassword} readOnly />
                  <button className="btn btn-outline-secondary" onClick={copyTemp}>Copy</button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={closeTempModal}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

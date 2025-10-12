import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { apiService } from '../services/api';

export default function Profile() {
  const { user, isLoading, loadUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [prefs, setPrefs] = useState({
    email_enabled: true,
    push_enabled: true,
    system_enabled: true,
    feedback_enabled: true,
    new_report_enabled: true,
  });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        setLoading(true);
        const { data } = await apiService.users.getMe();
        setProfile({
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          phone: data.phone || '',
          avatarUrl: data.avatarUrl || null,
          created_at: data.created_at,
        });
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

  const onPrefChange = (key) => (e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }));
  const onSavePrefs = async () => {
    try {
      setPrefsSaving(true);
      await apiService.notifications.updatePreferences(prefs);
      toast.success('Notification preferences saved');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to save preferences');
    } finally {
      setPrefsSaving(false);
    }
  };
    fetchMe();
    const fetchPrefs = async () => {
      try {
        setPrefsLoading(true);
        const { data } = await apiService.notifications.getPreferences();
        setPrefs({
          email_enabled: !!data.email_enabled,
          push_enabled: !!data.push_enabled,
          system_enabled: !!data.system_enabled,
          feedback_enabled: !!data.feedback_enabled,
          new_report_enabled: !!data.new_report_enabled,
        });
      } catch (e) {
        // safe default already set
      } finally {
        setPrefsLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const onChange = (key, val) => setProfile((p) => ({ ...p, [key]: val }));

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await apiService.users.updateMe({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });
      toast.success('Profile updated');
      await loadUser();
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to update profile';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Basic validation
    const allowed = ['image/png','image/jpeg','image/jpg','image/webp','image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Invalid image type');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be <= 3MB');
      return;
    }
    try {
      setAvatarUploading(true);
      const { data } = await apiService.users.uploadAvatar(file);
      setProfile((p) => ({ ...p, avatarUrl: data.url }));
      toast.success('Avatar updated');
      await loadUser();
    } catch (e2) {
      toast.error(e2?.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading || isLoading || !profile) {
    return (
      <div className="container py-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-3"><i className="bi bi-person-circle me-2"></i>My Profile</h2>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      <Row>
        <Col md={4} className="mb-3">
          <Card className="h-100">
            <Card.Header>
              <strong>Avatar</strong>
            </Card.Header>
            <Card.Body className="text-center">
              <div className="mb-3">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="rounded-circle"
                    style={{ width: 140, height: 140, objectFit: 'cover', border: '1px solid #eee' }}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.svg'; }}
                  />
                ) : (
                  <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: 140, height: 140, border: '1px solid #eee' }}>
                    <i className="bi bi-person fs-1 text-muted"></i>
                  </div>
                )}
              </div>
              <Form.Group controlId="avatar">
                <Form.Label className="btn btn-outline-primary">
                  {avatarUploading ? 'Uploading...' : 'Upload Avatar'}
                </Form.Label>
                <Form.Control type="file" accept="image/*" onChange={onAvatarChange} disabled={avatarUploading} hidden />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card>
            <Card.Header>
              <strong>Profile Details</strong>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={onSave}>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>First Name</Form.Label>
                      <Form.Control value={profile.firstName} onChange={(e) => onChange('firstName', e.target.value)} disabled={saving} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control value={profile.lastName} onChange={(e) => onChange('lastName', e.target.value)} disabled={saving} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Username</Form.Label>
                      <Form.Control value={profile.username} disabled readOnly />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control value={profile.email} disabled readOnly />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Phone</Form.Label>
                      <Form.Control value={profile.phone} onChange={(e) => onChange('phone', e.target.value)} disabled={saving} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Role</Form.Label>
                      <Form.Control value={profile.role} disabled readOnly />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex gap-2">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>

          <Card className="mt-3">
            <Card.Header>
              <strong>Notification Preferences</strong>
            </Card.Header>
            <Card.Body>
              {prefsLoading ? (
                <Spinner size="sm" />
              ) : (
                <Form>
                  <Row className="mb-2">
                    <Col md={6}>
                      <Form.Check type="switch" id="pref-email" label="Email notifications" checked={prefs.email_enabled} onChange={onPrefChange('email_enabled')} disabled={prefsSaving} />
                    </Col>
                    <Col md={6}>
                      <Form.Check type="switch" id="pref-push" label="Push/browser notifications" checked={prefs.push_enabled} onChange={onPrefChange('push_enabled')} disabled={prefsSaving} />
                    </Col>
                  </Row>
                  <Row className="mb-2">
                    <Col md={4}>
                      <Form.Check type="switch" id="pref-system" label="System" checked={prefs.system_enabled} onChange={onPrefChange('system_enabled')} disabled={prefsSaving} />
                    </Col>
                    <Col md={4}>
                      <Form.Check type="switch" id="pref-feedback" label="Feedback" checked={prefs.feedback_enabled} onChange={onPrefChange('feedback_enabled')} disabled={prefsSaving} />
                    </Col>
                    <Col md={4}>
                      <Form.Check type="switch" id="pref-newreport" label="New Reports" checked={prefs.new_report_enabled} onChange={onPrefChange('new_report_enabled')} disabled={prefsSaving} />
                    </Col>
                  </Row>
                  <div className="mt-2">
                    <Button variant="primary" size="sm" onClick={onSavePrefs} disabled={prefsSaving}>
                      {prefsSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

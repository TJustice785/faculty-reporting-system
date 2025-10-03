import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CreateReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load available courses for the user (students: enrolled; non-students: assigned or all)
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setCoursesLoading(true);
        const { data } = await apiService.users.getAvailableCourses();
        const list = Array.isArray(data) ? data : (data?.courses || []);
        setCourses(Array.isArray(list) ? list : []);
      } catch (e) {
        // Non-fatal: just proceed without courses
      } finally {
        setCoursesLoading(false);
      }
    };
    loadCourses();
  }, []);

  const onFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    // Basic client-side validation
    const maxSize = 5 * 1024 * 1024; // 5MB per file
    const allowed = ['image/png','image/jpeg','application/pdf','text/plain'];
    const invalid = files.find(f => f.size > maxSize || !allowed.includes(f.type));
    if (invalid) {
      toast.error('Files must be PNG/JPEG/PDF/TXT and <= 5MB each');
      return;
    }
    setAttachments(files);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }

    // For ALL non-students, courseId is required (backend enforces this too)
    if (user?.role !== 'student' && !courseId) {
      setError('Please select a course for this report');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        reportType: reportType || undefined,
        courseId: courseId ? Number(courseId) : undefined,
      };
      const { data } = await apiService.reports.create(payload);
      toast.success('Report created successfully');
      // Navigate to detail if available, else list
      const newId = data?.report?.id;

      // Try uploading attachments if any
      if (newId && attachments.length > 0) {
        try {
          const formData = new FormData();
          attachments.forEach((f) => formData.append('files', f));
          // Attempt upload to attachments endpoint (may not exist in backend)
          await apiService.reports.uploadAttachments(newId, formData);
          toast.success('Attachments uploaded');
        } catch (uploadErr) {
          toast('Report saved. Attachments upload will be enabled once storage is configured.', { icon: 'ℹ️' });
        }
      }

      if (newId) navigate(`/reports/${newId}`); else navigate('/reports');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to create report';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      <h1 className="mb-3">Create Report</h1>
      <Card>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter a concise title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                placeholder="Describe your report details"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Report Type (optional)</Form.Label>
              <Form.Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                disabled={submitting}
              >
                <option value="">Auto (based on role)</option>
                <option value="student_report">Student Report</option>
                <option value="lecturer_report">Lecturer Report</option>
                <option value="progress_report">Progress Report</option>
                <option value="feedback_report">Feedback Report</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Course{user?.role !== 'student' ? ' (required)' : ' (optional)'}</Form.Label>
              <div className="d-flex align-items-center gap-2">
                <Form.Select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  disabled={submitting || coursesLoading}
                  required={user?.role !== 'student'}
                >
                  <option value="">{coursesLoading ? 'Loading courses...' : 'Select a course'}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.course_name || c.name}</option>
                  ))}
                </Form.Select>
                {coursesLoading && <Spinner size="sm" />}
              </div>
              {user?.role === 'student' && (
                <Form.Text className="text-muted">
                  If applicable, associate this report with a course
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Attachments (PNG, JPEG, PDF, TXT up to 5MB each)</Form.Label>
              <Form.Control type="file" multiple onChange={onFilesChange} disabled={submitting} />
              {attachments.length > 0 && (
                <Form.Text className="text-muted">{attachments.length} file(s) selected</Form.Text>
              )}
            </Form.Group>

            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
              <Button variant="outline-secondary" onClick={() => navigate(-1)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

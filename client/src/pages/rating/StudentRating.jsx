import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentRating() {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    courseId: '',
    lecturerId: '',
    rating: '5',
    comments: '',
    classDate: new Date().toISOString().split('T')[0],
    academicYear: String(new Date().getFullYear()),
    semester: '1',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiService.dashboard.getPersonal();
        let list = data?.courses || [];
        if (!Array.isArray(list) || list.length === 0) {
          try {
            const alt = await apiService.users.getAvailableCourses();
            list = Array.isArray(alt.data?.courses) ? alt.data.courses : (Array.isArray(alt.data) ? alt.data : []);
          } catch (_) { /* ignore */ }
        }
        // Normalize course shape to { id, course_name, course_code }
        const normalized = (list || []).map(c => ({
          id: c.id ?? c.course_id ?? c.courseId,
          course_name: c.course_name ?? c.name ?? c.title ?? 'Untitled',
          course_code: c.course_code ?? c.code ?? '',
        })).filter(c => c.id != null);
        setCourses(normalized);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadLecturers = async () => {
      try {
        if (!form.courseId) { setLecturers([]); return; }
        const { data } = await apiService.users.getLecturersByCourse(form.courseId);
        let lecs = Array.isArray(data?.lecturers) ? data.lecturers : [];
        // Fallback: if empty, try all lecturers
        if (lecs.length === 0) {
          try {
            const all = await apiService.users.getAll({ role: 'lecturer', limit: 200 });
            lecs = Array.isArray(all.data?.users) ? all.data.users : (Array.isArray(all.data) ? all.data : []);
          } catch (_) {}
        }
        // Normalize
        const normLecs = lecs.map(l => ({
          id: l.id,
          first_name: l.first_name ?? l.firstName ?? '',
          last_name: l.last_name ?? l.lastName ?? '',
        })).filter(l => l.id != null);
        setLecturers(normLecs);
      } catch (_) {
        setLecturers([]);
      }
    };
    loadLecturers();
  }, [form.courseId]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.courseId) { toast.error('Please select a course'); return; }
    if (!form.lecturerId) { toast.error('Please select a lecturer'); return; }
    // Prevent duplicate if already rated (basic client-side guard)
    const selected = courses.find(c => String(c.id) === String(form.courseId));
    if (selected?.my_rating) {
      toast.error('You have already rated this course.');
      return;
    }
    try {
      setSaving(true);
      await apiService.users.rateClass({
        courseId: Number(form.courseId),
        lecturerId: Number(form.lecturerId),
        rating: Number(form.rating),
        comment: form.comments,
        classDate: form.classDate,
        academicYear: form.academicYear,
        semester: Number(form.semester),
      });
      toast.success('Thank you for your rating');
      setForm((f) => ({ ...f, comments: '' }));
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container py-4"><Spinner /></div>;
  if (error) return <div className="container py-4"><Alert variant="danger">{error}</Alert></div>;

  return (
    <div className="container py-4">
      <h2 className="mb-3">Rate a Class</h2>
      <Card>
        <Card.Body>
          <Form onSubmit={onSubmit}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Course</Form.Label>
                  <Form.Select name="courseId" value={form.courseId} onChange={onChange}>
                    <option value="">Select course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.course_name} ({c.course_code})</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Lecturer</Form.Label>
                  <Form.Select name="lecturerId" value={form.lecturerId} onChange={onChange} disabled={!form.courseId}>
                    <option value="">{form.courseId ? 'Select lecturer' : 'Select a course first'}</option>
                    {lecturers.map(l => (
                      <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Rating</Form.Label>
                  <Form.Select name="rating" value={form.rating} onChange={onChange}>
                    {[5,4,3,2,1].map(v => (<option key={v} value={v}>{v}</option>))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Class Date</Form.Label>
                  <Form.Control type="date" name="classDate" value={form.classDate} onChange={onChange} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Year</Form.Label>
                  <Form.Control name="academicYear" value={form.academicYear} onChange={onChange} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Semester</Form.Label>
                  <Form.Select name="semester" value={form.semester} onChange={onChange}>
                    {[1,2,3,4,5,6,7,8].map(v => (<option key={v} value={v}>{v}</option>))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Comments (optional)</Form.Label>
              <Form.Control as="textarea" rows={3} name="comments" value={form.comments} onChange={onChange} />
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button type="submit" variant="success" disabled={saving}>{saving ? 'Submitting...' : 'Submit Rating'}</Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* My existing ratings overview (from courses.my_rating) */}
      <Card className="mt-3">
        <Card.Header><strong>My Ratings</strong></Card.Header>
        <Card.Body>
          {courses.filter(c => c.my_rating).length === 0 ? (
            <div className="text-muted">You have not rated any courses yet.</div>
          ) : (
            <Row className="g-2">
              {courses.filter(c => c.my_rating).map(c => (
                <Col md={6} key={c.id}>
                  <div className="p-3 border rounded d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">{c.course_name} {c.course_code ? `(${c.course_code})` : ''}</div>
                      <div className="text-muted small">Your rating:</div>
                    </div>
                    <div title={`${Number(c.my_rating).toFixed(1)} / 5`}>
                      {[1,2,3,4,5].map(i => (
                        <i key={i} className={`bi ${i <= Math.round(c.my_rating) ? 'bi-star-fill text-warning' : 'bi-star text-warning'}`} style={{ fontSize: 16, marginLeft: 2 }} />
                      ))}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

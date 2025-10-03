import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

export default function AssignModules() {
  const location = useLocation();
  const formRef = useRef(null);
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [streamFilter, setStreamFilter] = useState('');
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    lecturerId: '',
    courseId: '',
    academicYear: new Date().getFullYear().toString(),
    semester: 1,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      // Load users and filter lecturers
      const [usersRes, coursesRes, streamsRes] = await Promise.all([
        apiService.users.getAll({ limit: 100 }),
        apiService.users.getAvailableCourses({ all: true }), // return all courses
        apiService.users.getStreams(),
      ]);
      const allUsers = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.users || [];
      const lec = allUsers.filter(u => (u.role || u.role_name) === 'lecturer' || u.role === 'lecturer');
      setLecturers(lec);
      const list = Array.isArray(coursesRes.data?.courses) ? coursesRes.data.courses : (Array.isArray(coursesRes.data) ? coursesRes.data : []);
      setCourses(list);
      const streamsList = Array.isArray(streamsRes.data?.streams) ? streamsRes.data.streams : (Array.isArray(streamsRes.data) ? streamsRes.data : []);
      setStreams(streamsList);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to load data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload courses when the stream filter changes
  useEffect(() => {
    const loadCoursesByStream = async () => {
      try {
        setLoading(true);
        const params = streamFilter ? { stream_id: streamFilter, all: true } : { all: true };
        const res = await apiService.users.getAvailableCourses(params);
        const list = Array.isArray(res.data?.courses) ? res.data.courses : (Array.isArray(res.data) ? res.data : []);
        setCourses(list);
      } catch (e) {
        // keep prior courses, surface toast if needed
      } finally {
        setLoading(false);
      }
    };
    loadCoursesByStream();
  }, [streamFilter]);

  const filteredLecturers = useMemo(() => {
    const q = lecturerSearch.trim().toLowerCase();
    if (!q) return lecturers;
    return lecturers.filter(l => [l.firstName, l.first_name, l.lastName, l.last_name, l.email]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q)));
  }, [lecturers, lecturerSearch]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => [c.course_name, c.course_code, c.name, c.title]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q)));
  }, [courses, courseSearch]);

  // Prefill from query params when courses are loaded
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qCourseId = params.get('courseId');
    const mode = params.get('mode');
    if (qCourseId) {
      setForm((prev) => ({ ...prev, courseId: String(qCourseId) }));
      // focus form for better UX
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
    // If mode=add is supplied, we currently surface only the Assign form.
    // Future: show an inline "Add Module" section.
  }, [location.search]);

  const onAssign = async (e) => {
    e.preventDefault();
    if (!form.lecturerId || !form.courseId) {
      toast.error('Please select a lecturer and a course');
      return;
    }
    try {
      await apiService.users.assignCourse(form.lecturerId, {
        courseId: Number(form.courseId),
        academicYear: form.academicYear,
        semester: Number(form.semester),
      });
      toast.success('Course assigned to lecturer');
      setForm({ ...form, courseId: '' });
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to assign course';
      toast.error(msg);
    }
  };

  if (loading) return <div className="container py-4"><Spinner /></div>;
  if (error) return <div className="container py-4"><Alert variant="danger">{error}</Alert></div>;

  return (
    <div className="container py-4">
      <h2 className="mb-3"><i className="bi bi-person-workspace me-2"></i>Assign Modules</h2>

      {/* Add Module (Course) inline section when mode=add */}
      {new URLSearchParams(location.search).get('mode') === 'add' && (
        <Card className="mb-3">
          <Card.Header>
            <strong>Add Module (Course)</strong>
          </Card.Header>
          <Card.Body>
            <AddCourseForm
              streams={streams}
              onCreated={(course) => {
                // Update list and preselect
                setCourses(prev => [course, ...prev]);
                setForm(prev => ({ ...prev, courseId: String(course.id) }));
                toast.success('Module created and selected');
                setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
              }}
            />
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Header>
          <strong>Assign Course to Lecturer</strong>
        </Card.Header>
        <Card.Body ref={formRef}>
          <Form onSubmit={onAssign}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Stream (optional)</Form.Label>
                  <Form.Select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
                    <option value="">All streams</option>
                    {streams.map(s => (
                      <option key={s.id} value={s.id}>{s.stream_name} {s.stream_code ? `(${s.stream_code})` : ''}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Lecturer</Form.Label>
                  <Form.Control placeholder="Search lecturer..." className="mb-2" value={lecturerSearch} onChange={(e) => setLecturerSearch(e.target.value)} />
                  <Form.Select value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })}>
                    <option value="">Select lecturer</option>
                    {filteredLecturers.map(l => (
                      <option key={l.id} value={l.id}>{(l.firstName || l.first_name) || ''} {(l.lastName || l.last_name) || ''} — {l.email}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Course</Form.Label>
                  <Form.Control placeholder="Search course..." className="mb-2" value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} />
                  <Form.Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                    <option value="">Select course</option>
                    {filteredCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.course_name} {c.course_code ? `(${c.course_code})` : ''}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mt-1">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Academic Year</Form.Label>
                  <Form.Control value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Semester</Form.Label>
                  <Form.Select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="mt-3 d-flex justify-content-end">
              <Button type="submit" variant="primary">Assign</Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Badge, Form } from 'react-bootstrap';
import { apiService } from '../../services/api';

export default function PLMonitoring() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [streams, setStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState('');
  const [courses, setCourses] = useState([]);
  const [pending, setPending] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Personal overview as before
        const { data } = await apiService.dashboard.getPersonal();
        setStats(data?.personalStats || {});
        setPending(data?.pendingActions || []);
        // Streams managed by user
        const streamsRes = await apiService.pl.getStreams();
        const list = streamsRes?.data?.streams || [];
        setStreams(list);
        // Auto-select first stream
        if (list.length > 0) {
          const sid = String(list[0].id);
          setSelectedStream(sid);
          const [coursesRes, reportsRes] = await Promise.all([
            apiService.pl.getStreamCourses(sid),
            apiService.pl.getStreamReports(sid, { status: 'submitted' })
          ]);
          setCourses(coursesRes?.data?.courses || []);
          setReports(reportsRes?.data?.reports || []);
        } else {
          setCourses([]);
          setReports([]);
        }
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load monitoring');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onStreamChange = async (e) => {
    const sid = e.target.value;
    setSelectedStream(sid);
    try {
      const [cRes, rRes] = await Promise.all([
        apiService.pl.getStreamCourses(sid),
        apiService.pl.getStreamReports(sid, { status: 'submitted' })
      ]);
      setCourses(cRes?.data?.courses || []);
      setReports(rRes?.data?.reports || []);
    } catch (_) {}
  };

  if (loading) return <div className="container py-4"><Spinner /></div>;
  if (error) return <div className="container py-4"><Alert variant="danger">{error}</Alert></div>;

  return (
    <div className="container py-4">
      <h2 className="mb-3">Program Leader Monitoring</h2>

      <Row className="mb-3">
        <Col md={4}>
          <Card>
            <Card.Header><strong>Overview</strong></Card.Header>
            <Card.Body>
              <div className="d-flex flex-column gap-2">
                <div><strong>Managed Streams:</strong> {stats.managed_streams ?? stats.supervised_streams ?? 0}</div>
                <div><strong>Reports to Review:</strong> {stats.reports_to_review ?? stats.pending_reports ?? 0}</div>
                <div><strong>Lecturers:</strong> {stats.managed_lecturers ?? stats.supervised_staff ?? 0}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card>
            <Card.Header><strong>Pending Actions</strong></Card.Header>
            <Card.Body>
              {pending.length === 0 ? (
                <div className="text-muted">No pending actions</div>
              ) : (
                <Table responsive hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Title</th>
                      <th>From</th>
                      <th>Course</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(p => (
                      <tr key={p.id}>
                        <td>{p.title}</td>
                        <td>{p.first_name} {p.last_name}</td>
                        <td>{p.course_name}</td>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Stream</Form.Label>
            <Form.Select value={selectedStream} onChange={onStreamChange}>
              {streams.map(s => (
                <option key={s.id} value={s.id}>{s.stream_name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Card>
        <Card.Header><strong>Courses</strong></Card.Header>
        <Card.Body>
          {courses.length === 0 ? (
            <div className="text-muted">No courses</div>
          ) : (
            <Table responsive hover size="sm" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Course</th>
                  <th>Code</th>
                  <th>Stream</th>
                  <th>Students</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id}>
                    <td>{c.course_name}</td>
                    <td>{c.course_code}</td>
                    <td>{c.stream_name}</td>
                    <td><Badge bg="secondary">{c.student_count ?? 0}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Card className="mt-3">
        <Card.Header><strong>Stream Reports (Submitted)</strong></Card.Header>
        <Card.Body>
          {reports.length === 0 ? (
            <div className="text-muted">No submitted reports</div>
          ) : (
            <Table responsive hover size="sm" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Title</th>
                  <th>From</th>
                  <th>Course</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.first_name} {r.last_name} ({r.reporter_role})</td>
                    <td>{r.course_name}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

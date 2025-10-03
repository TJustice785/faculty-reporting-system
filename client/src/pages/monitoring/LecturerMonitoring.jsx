import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { apiService } from '../../services/api';

export default function LecturerMonitoring() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [courses, setCourses] = useState([]);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiService.dashboard.getPersonal();
        setStats(data?.personalStats || {});
        setCourses(data?.courses || []);
        setPending(data?.pendingActions || []);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load monitoring data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="container py-4"><Spinner /></div>;
  if (error) return <div className="container py-4"><Alert variant="danger">{error}</Alert></div>;

  return (
    <div className="container py-4">
      <h2 className="mb-3">Lecturer Monitoring</h2>

      <Row>
        <Col md={4}>
          <Card className="mb-3">
            <Card.Header><strong>My Stats</strong></Card.Header>
            <Card.Body>
              <div className="d-flex flex-column gap-2">
                <div><strong>My Courses:</strong> {stats.my_courses ?? 0}</div>
                <div><strong>My Reports:</strong> {stats.my_reports ?? 0}</div>
                <div><strong>Total Students:</strong> {stats.total_students ?? 0}</div>
                <div><strong>Avg Received Rating:</strong> {Number(stats.avg_received_rating || 0).toFixed(1)}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          <Card className="mb-3">
            <Card.Header><strong>Pending Student Reports</strong></Card.Header>
            <Card.Body>
              {pending.length === 0 ? (
                <div className="text-muted">No pending student reports</div>
              ) : (
                <Table responsive hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Title</th>
                      <th>Student</th>
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

      <Card>
        <Card.Header><strong>My Courses</strong></Card.Header>
        <Card.Body>
          {courses.length === 0 ? (
            <div className="text-muted">No courses assigned</div>
          ) : (
            <Table responsive hover size="sm" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Course</th>
                  <th>Code</th>
                  <th>Stream</th>
                  <th>Students</th>
                  <th>Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id}>
                    <td>{c.course_name}</td>
                    <td>{c.course_code}</td>
                    <td>{c.stream_name}</td>
                    <td><Badge bg="secondary">{c.student_count ?? 0}</Badge></td>
                    <td>{c.avg_rating ? Number(c.avg_rating).toFixed(1) : 'N/A'}</td>
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

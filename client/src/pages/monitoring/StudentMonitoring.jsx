import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { apiService } from '../../services/api';

export default function StudentMonitoring() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [courses, setCourses] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiService.dashboard.getPersonal();
        setStats(data?.personalStats || {});
        setCourses(data?.courses || []);
        setRecent(data?.recentReports || []);
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
      <h2 className="mb-3">Student Monitoring</h2>

      <Row>
        <Col md={4}>
          <Card className="mb-3">
            <Card.Header><strong>My Stats</strong></Card.Header>
            <Card.Body>
              <div className="d-flex flex-column gap-2">
                <div><strong>My Reports:</strong> {stats.my_reports ?? 0}</div>
                <div><strong>Pending Reports:</strong> {stats.pending_reports ?? 0}</div>
                <div><strong>Enrolled Courses:</strong> {stats.enrolled_courses ?? 0}</div>
                <div><strong>Avg Class Rating:</strong> {Number(stats.avg_class_rating || 0).toFixed(1)}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card className="mb-3">
            <Card.Header><strong>My Courses</strong></Card.Header>
            <Card.Body>
              {courses.length === 0 ? (
                <div className="text-muted">No enrolled courses found</div>
              ) : (
                <Table responsive hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Course</th>
                      <th>Code</th>
                      <th>Stream</th>
                      <th>Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map(c => (
                      <tr key={c.id}>
                        <td>{c.course_name}</td>
                        <td>{c.course_code}</td>
                        <td>{c.stream_name}</td>
                        <td>
                          <Badge bg="info">{c.completion_percentage ?? 0}%</Badge>
                        </td>
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
        <Card.Header><strong>My Recent Reports</strong></Card.Header>
        <Card.Body>
          {recent.length === 0 ? (
            <div className="text-muted">No recent reports</div>
          ) : (
            <Table responsive hover size="sm" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.status}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
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

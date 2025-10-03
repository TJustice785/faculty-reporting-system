import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { apiService } from '../../services/api';

export default function LecturerRating() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiService.dashboard.getPersonal();
        setStats(data?.personalStats || {});
        setCourses(data?.courses || []);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load rating data');
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
      <h2 className="mb-3">My Ratings</h2>

      <Row className="mb-3">
        <Col md={4}>
          <Card>
            <Card.Header><strong>Overview</strong></Card.Header>
            <Card.Body>
              <div><strong>Avg Received Rating:</strong> {Number(stats.avg_received_rating || 0).toFixed(1)} / 5</div>
              <div><strong>Courses:</strong> {courses.length}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card>
            <Card.Header><strong>By Course</strong></Card.Header>
            <Card.Body>
              {courses.length === 0 ? (
                <div className="text-muted">No courses assigned</div>
              ) : (
                <Table responsive hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Course</th>
                      <th>Code</th>
                      <th>Avg Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map(c => (
                      <tr key={c.id}>
                        <td>{c.course_name}</td>
                        <td>{c.course_code}</td>
                        <td>
                          {c.avg_rating ? (
                            <span title={`${Number(c.avg_rating).toFixed(1)} / 5`}>
                              {[1,2,3,4,5].map(i => (
                                <i key={i} className={`bi ${i <= Math.round(c.avg_rating) ? 'bi-star-fill text-warning' : 'bi-star text-warning'}`} style={{ fontSize: 14, marginRight: 2 }} />
                              ))}
                            </span>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
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
    </div>
  );
}

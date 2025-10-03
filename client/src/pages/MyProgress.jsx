import React, { useEffect, useState } from 'react';
import { Card, Row, Col, ProgressBar, Alert, Spinner } from 'react-bootstrap';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

export default function MyProgress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiService.dashboard.getPersonal();
        setData(data);
      } catch (e) {
        const msg = e?.response?.data?.error || 'Failed to load progress';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (<div className="container py-4"><Spinner /></div>);
  if (error) return (<div className="container py-4"><Alert variant="danger">{error}</Alert></div>);

  const courses = data?.courses || [];
  const stats = data?.personalStats || {};

  return (
    <div className="container py-4">
      <h2 className="mb-3"><i className="bi bi-graph-up-arrow me-2"></i>My Progress</h2>

      <Row className="g-3 mb-3">
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="text-muted small">My Reports</div>
              <div className="display-6">{stats.my_reports || 0}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="text-muted small">Pending (Submitted)</div>
              <div className="display-6">{stats.pending_reports || 0}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="text-muted small">Enrolled Courses</div>
              <div className="display-6">{stats.enrolled_courses || courses.length || 0}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="text-muted small">Avg Class Rating</div>
              <div className="display-6">{stats.avg_class_rating ? Number(stats.avg_class_rating).toFixed(1) : 'N/A'}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header>
          <strong>Course Progress</strong>
        </Card.Header>
        <Card.Body>
          {courses.length === 0 ? (
            <div className="text-muted">No courses found</div>
          ) : (
            <Row className="g-3">
              {courses.map((c) => (
                <Col md={6} key={c.id}>
                  <Card className="h-100">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div>
                          <div className="fw-bold">{c.course_name} {c.course_code ? `(${c.course_code})` : ''}</div>
                          <div className="text-muted small">Stream: {c.stream_name || 'N/A'}</div>
                        </div>
                        <div className="text-muted small">Sem {c.semester || '-'}</div>
                      </div>
                      <ProgressBar now={Number(c.completion_percentage || 0)} label={`${Number(c.completion_percentage || 0)}%`} />
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

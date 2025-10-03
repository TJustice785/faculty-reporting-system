import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Table } from 'react-bootstrap';
import { apiService } from '../../services/api';

export default function PRLCourses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiService.dashboard.getPersonal();
        setCourses(data?.courses || []);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load courses');
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
      <h2 className="mb-3">Stream Courses & Lectures</h2>
      <Card>
        <Card.Body>
          {courses.length === 0 ? (
            <div className="text-muted">No courses found under your streams</div>
          ) : (
            <Table responsive hover className="mb-0">
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
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>{c.course_name}</td>
                    <td>{c.course_code}</td>
                    <td>{c.stream_name}</td>
                    <td>{c.student_count ?? 0}</td>
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

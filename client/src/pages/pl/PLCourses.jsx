import React, { useEffect, useState } from 'react';
import { Card, Table, Spinner, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';

export default function PLCourses() {
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">PL Courses</h2>
        <div className="d-flex gap-2">
          <Button as={Link} to="/admin/assign-modules" variant="outline-primary" size="sm">
            Assign Lecturer Modules
          </Button>
        </div>
      </div>
      <Card>
        <Card.Body>
          {courses.length === 0 ? (
            <div className="text-muted">No courses available.</div>
          ) : (
            <Table responsive hover>
              <thead className="table-light">
                <tr>
                  <th>Course</th>
                  <th>Code</th>
                  <th>Stream</th>
                  <th>Students</th>
                  <th>Avg Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id}>
                    <td>{c.course_name}</td>
                    <td>{c.course_code}</td>
                    <td>{c.stream_name}</td>
                    <td>{c.student_count ?? 0}</td>
                    <td>{c.avg_rating ? Number(c.avg_rating).toFixed(1) : 'N/A'}</td>
                    <td className="d-flex gap-2">
                      <Button as={Link} to={`/admin/assign-modules?courseId=${c.id}`} size="sm" variant="outline-primary">
                        Assign
                      </Button>
                      <Button as={Link} to={`/admin/assign-modules?mode=add&courseId=${c.id}`} size="sm" variant="outline-success">
                        Add Module
                      </Button>
                    </td>
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

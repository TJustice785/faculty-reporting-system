import React, { useEffect, useState } from 'react';
import { Card, Table, Spinner, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';

export default function PLClasses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiService.dashboard.getPersonal();
        setClasses(data?.courses || []);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load classes');
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
      <h2 className="mb-3">PL Classes</h2>
      <Card>
        <Card.Body>
          {classes.length === 0 ? (
            <div className="text-muted">No classes available</div>
          ) : (
            <Table responsive hover>
              <thead className="table-light">
                <tr>
                  <th>Course</th>
                  <th>Code</th>
                  <th>Stream</th>
                  <th>Students</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c.id}>
                    <td>{c.course_name}</td>
                    <td>{c.course_code}</td>
                    <td>{c.stream_name}</td>
                    <td>{c.student_count ?? 0}</td>
                    <td className="d-flex gap-2">
                      <Button as={Link} to={`/admin/assign-modules?courseId=${c.id}`} size="sm" variant="outline-primary">
                        Assign Class
                      </Button>
                      <Button as={Link} to={`/reports?courseId=${c.id}`} size="sm" variant="outline-secondary">
                        View Reports
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

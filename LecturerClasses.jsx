import React, { useEffect, useState } from 'react';
import { Card, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import { apiService } from '../../services/api';
import { Link } from 'react-router-dom';

export default function LecturerClasses() {
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
      <h2 className="mb-3">My Classes</h2>
      <Card>
        <Card.Body>
          {courses.length === 0 ? (
            <div className="text-muted">No assigned courses.</div>
          ) : (
            <Table responsive hover className="mb-0">
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
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>{c.course_name}</td>
                    <td>{c.course_code}</td>
                    <td>{c.stream_name}</td>
                    <td><Badge bg="secondary">{c.student_count ?? 0}</Badge></td>
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
                    <td>
                      <Link to="/reports/lecturer/new" className="btn btn-sm btn-outline-primary">
                        <i className="bi bi-journal-plus me-1"></i>
                        New Report
                      </Link>
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

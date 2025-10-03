import React, { useEffect, useState } from 'react';
import { Card, Table, Spinner, Alert, Badge, Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';

export default function PLLectures() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [byLecturer, setByLecturer] = useState({});
  const [streams, setStreams] = useState([]);
  const [filterStream, setFilterStream] = useState('');
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [{ data: usersData }, { data: coursesData }] = await Promise.all([
          apiService.users.getAll({ role: 'lecturer', limit: 200 }),
          apiService.users.getAvailableCourses(),
        ]);
        const lecList = Array.isArray(usersData?.users) ? usersData.users : (Array.isArray(usersData) ? usersData : []);
        const courseList = Array.isArray(coursesData?.courses) ? coursesData.courses : (Array.isArray(coursesData) ? coursesData : []);
        setLecturers(lecList);
        setCourses(courseList);
        const streamOpts = Array.from(new Map(courseList.map(c => [String(c.stream_id || c.streamId || c.stream_name || ''), { 
          id: c.stream_id || c.streamId || String(c.stream_name || ''),
          name: c.stream_name || String(c.stream_id || c.streamId || 'Unknown')
        }])).values());
        setStreams(streamOpts);

        // Build mapping of lecturerId -> courses using available fields if present
        const map = {};
        for (const lec of lecList) map[lec.id] = [];

        // If course carries assigned lecturer ids/names, use them
        let usedDirect = false;
        for (const c of courseList) {
          const candidateIds = c.lecturer_ids || c.assigned_lecturer_ids || c.lecturers?.map(l => l.id) || [];
          if (candidateIds && candidateIds.length) {
            usedDirect = true;
            for (const lid of candidateIds) {
              if (map[lid]) map[lid].push(c);
            }
          }
        }

        // Fallback: fetch lecturers per course (may be slower)
        if (!usedDirect) {
          for (const c of courseList) {
            try {
              const { data: lecByCourse } = await apiService.users.getLecturersByCourse(c.id);
              const arr = lecByCourse?.lecturers || [];
              for (const l of arr) {
                if (map[l.id]) map[l.id].push(c);
              }
            } catch (_) { /* ignore per-course errors */ }
          }
        }
        setByLecturer(map);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load lecturers');
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
      <h2 className="mb-3">Lecturers & Assigned Classes</h2>

      <Card className="mb-3">
        <Card.Body>
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Filter by Stream</Form.Label>
                <Form.Select value={filterStream} onChange={(e) => setFilterStream(e.target.value)}>
                  <option value="">All Streams</option>
                  {streams.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group>
                <Form.Label>Search Course</Form.Label>
                <Form.Control placeholder="Course name or code" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
              </Form.Group>
            </div>
          </div>
        </Card.Body>
      </Card>
      {lecturers.length === 0 ? (
        <Card><Card.Body><div className="text-muted">No lecturers available</div></Card.Body></Card>
      ) : (
        lecturers.map(l => (
          <Card className="mb-3" key={l.id}>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <strong>{l.first_name} {l.last_name}</strong>
                <div className="text-muted small">{l.email}</div>
              </div>
              <Badge bg="secondary">{(byLecturer[l.id] || []).length} classes</Badge>
            </Card.Header>
            <Card.Body>
              {(byLecturer[l.id] || []).length === 0 ? (
                <div className="text-muted">No classes assigned</div>
              ) : (
                (() => {
                  const items = (byLecturer[l.id] || []).filter(c => {
                    const matchStream = !filterStream || (c.stream_name || '').toLowerCase() === filterStream.toLowerCase();
                    const q = filterText.trim().toLowerCase();
                    const matchText = !q || (c.course_name || '').toLowerCase().includes(q) || (c.course_code || '').toLowerCase().includes(q);
                    return matchStream && matchText;
                  });
                  if (items.length === 0) {
                    return <div className="text-muted">No classes match current filters</div>;
                  }
                  return (
                    <Table responsive hover size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Course</th>
                          <th>Code</th>
                          <th>Stream</th>
                          <th>Students</th>
                          <th>Year</th>
                          <th>Semester</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(c => (
                          <tr key={c.id}>
                            <td>{c.course_name}</td>
                            <td>{c.course_code}</td>
                            <td>{c.stream_name}</td>
                            <td>{c.student_count ?? 0}</td>
                            <td>{c.academic_year || c.year || '-'}</td>
                            <td>{c.semester || '-'}</td>
                            <td>
                              <Button as={Link} to={`/admin/assign-modules?courseId=${c.id}`} size="sm" variant="outline-primary">
                                Reassign
                              </Button>
                              <Button as={Link} to={`/reports?courseId=${c.id}`} size="sm" variant="outline-secondary" className="ms-2">
                                View Reports
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  );
                })()
              )}
            </Card.Body>
          </Card>
        ))
      )}
    </div>
  );
}

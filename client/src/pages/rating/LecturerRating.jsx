import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Badge, Form, Button } from 'react-bootstrap';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

export default function LecturerRating() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [courses, setCourses] = useState([]);
  const [peerReceived, setPeerReceived] = useState([]);
  const [peerGiven, setPeerGiven] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ ratedLecturerId: '', rating: 5, comment: '' });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiService.dashboard.getPersonal();
        setStats(data?.personalStats || {});
        let crs = data?.courses || [];
        // If courses are empty, populate based on role scope
        const myRole = data?.user?.role;
        if ((!Array.isArray(crs) || crs.length === 0) && ['program_leader','principal_lecturer'].includes(myRole)) {
          try {
            const streamsRes = await apiService.pl.getStreams();
            const streams = streamsRes?.data?.streams || [];
            const courseMap = new Map();
            for (const s of streams) {
              try {
                const coursesRes = await apiService.pl.getStreamCourses(s.id);
                const scourses = coursesRes?.data?.courses || [];
                for (const sc of scourses) {
                  if (!sc?.id) continue;
                  courseMap.set(sc.id, sc);
                }
              } catch (_) {}
            }
            crs = Array.from(courseMap.values());
          } catch (_) {}
        } else if ((!Array.isArray(crs) || crs.length === 0) && (myRole === 'faculty_manager' || myRole === 'admin')) {
          try {
            const { data: pc } = await apiService.users.getPublicCourses({ limit: 50 });
            const list = Array.isArray(pc?.items) ? pc.items : (Array.isArray(pc) ? pc : []);
            crs = list;
          } catch (_) {}
        }
        setCourses(crs);
        // Load peer ratings received/given
        const [rec, giv] = await Promise.all([
          apiService.ratings.getPeerReceived(),
          apiService.ratings.getPeerGiven(),
        ]);
        setPeerReceived(rec?.data?.ratings || []);
        setPeerGiven(giv?.data?.ratings || []);
        // Build colleagues list
        const meId = data?.user?.id;
        const myRole = data?.user?.role;
        const lecturerMap = new Map();

        // 1) If user teaches courses, include co-lecturers on those courses
        if (Array.isArray(crs) && crs.length > 0) {
          for (const c of crs) {
            try {
              const { data: lecRes } = await apiService.users.getLecturersByCourse(c.id);
              const list = Array.isArray(lecRes?.lecturers) ? lecRes.lecturers : (Array.isArray(lecRes) ? lecRes : []);
              for (const l of list) {
                if (!l?.id) continue;
                lecturerMap.set(l.id, l);
              }
            } catch (_) {}
          }
        }

        // 2) If PL/PRL, include lecturers from managed streams
        if (['program_leader','principal_lecturer'].includes(myRole)) {
          try {
            const streamsRes = await apiService.pl.getStreams();
            const streams = streamsRes?.data?.streams || [];
            for (const s of streams) {
              try {
                const coursesRes = await apiService.pl.getStreamCourses(s.id);
                const scourses = coursesRes?.data?.courses || [];
                for (const sc of scourses) {
                  try {
                    const { data: lecRes } = await apiService.users.getLecturersByCourse(sc.id);
                    const list = Array.isArray(lecRes?.lecturers) ? lecRes.lecturers : (Array.isArray(lecRes) ? lecRes : []);
                    for (const l of list) {
                      if (!l?.id) continue;
                      lecturerMap.set(l.id, l);
                    }
                  } catch (_) {}
                }
              } catch (_) {}
            }
          } catch (_) {}
        }

        // 3) If FM/Admin and still empty, try fetching all lecturers (best effort)
        if ((myRole === 'faculty_manager' || myRole === 'admin') && lecturerMap.size === 0) {
          try {
            const { data: usersRes } = await apiService.users.getAll({ role: 'lecturer', limit: 100 });
            const list = Array.isArray(usersRes?.items) ? usersRes.items : (Array.isArray(usersRes) ? usersRes : []);
            for (const l of list) {
              if (!l?.id) continue;
              lecturerMap.set(l.id, l);
            }
          } catch (_) {}
        }

        const options = Array.from(lecturerMap.values()).filter(l => l.id !== meId);
        setColleagues(options);
        if (options.length > 0) setForm((f) => ({ ...f, ratedLecturerId: String(options[0].id) }));
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load rating data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onFormChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const ratedLecturerId = parseInt(form.ratedLecturerId, 10);
      const rating = Number(form.rating);
      await apiService.ratings.addPeer({ ratedLecturerId, rating, comment: form.comment });
      toast.success('Peer rating submitted');
      // Refresh lists
      const [rec, giv] = await Promise.all([
        apiService.ratings.getPeerReceived(),
        apiService.ratings.getPeerGiven(),
      ]);
      setPeerReceived(rec?.data?.ratings || []);
      setPeerGiven(giv?.data?.ratings || []);
      setForm((f) => ({ ...f, comment: '' }));
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

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

      <Row>
        <Col md={6} className="mb-3">
          <Card>
            <Card.Header><strong>Peer Ratings - Received</strong></Card.Header>
            <Card.Body>
              {peerReceived.length === 0 ? (
                <div className="text-muted">No peer ratings yet</div>
              ) : (
                <Table responsive hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>From</th>
                      <th>Rating</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peerReceived.map((r) => (
                      <tr key={r.id}>
                        <td>{r.rater_first_name} {r.rater_last_name}</td>
                        <td>{Number(r.rating).toFixed(1)} / 5</td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card>
            <Card.Header><strong>Peer Ratings - Given</strong></Card.Header>
            <Card.Body>
              {peerGiven.length === 0 ? (
                <div className="text-muted">No peer ratings given</div>
              ) : (
                <Table responsive hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>To</th>
                      <th>Rating</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peerGiven.map((r) => (
                      <tr key={r.id}>
                        <td>{r.rated_first_name} {r.rated_last_name}</td>
                        <td>{Number(r.rating).toFixed(1)} / 5</td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
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
        <Card.Header><strong>Rate a Colleague</strong></Card.Header>
        <Card.Body>
          {colleagues.length === 0 ? (
            <div className="text-muted">No colleagues found for your courses.</div>
          ) : (
            <Form onSubmit={onSubmit} className="d-flex flex-column gap-3">
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Lecturer</Form.Label>
                    <Form.Select value={form.ratedLecturerId} onChange={onFormChange('ratedLecturerId')} disabled={submitting}>
                      {colleagues.map((l) => (
                        <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Rating</Form.Label>
                    <Form.Select value={form.rating} onChange={onFormChange('rating')} disabled={submitting}>
                      {[5,4.5,4,3.5,3,2.5,2,1.5,1].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group>
                <Form.Label>Comment (optional)</Form.Label>
                <Form.Control as="textarea" rows={3} value={form.comment} onChange={onFormChange('comment')} disabled={submitting} />
              </Form.Group>
              <div>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Rating'}
                </Button>
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

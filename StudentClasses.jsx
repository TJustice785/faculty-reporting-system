import React, { useEffect, useState } from 'react';
import { Card, Table, Spinner, Alert, Button } from 'react-bootstrap';
import { apiService } from '../../services/api';
import RatingModal from '../../components/common/RatingModal.jsx';
import toast from 'react-hot-toast';

export default function StudentClasses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [ratingFor, setRatingFor] = useState(null); // course object
  const [lecturers, setLecturers] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await apiService.dashboard.getPersonal();
      let list = data?.courses || [];
      if (!Array.isArray(list) || list.length === 0) {
        try {
          const alt = await apiService.users.getAvailableCourses();
          list = Array.isArray(alt.data?.courses) ? alt.data.courses : (Array.isArray(alt.data) ? alt.data : []);
        } catch (_) { /* ignore */ }
      }
      const normalized = (list || []).map(c => ({
        id: c.id ?? c.course_id ?? c.courseId,
        course_name: c.course_name ?? c.name ?? c.title ?? 'Untitled',
        course_code: c.course_code ?? c.code ?? '',
        stream_name: c.stream_name ?? c.stream ?? '',
        student_count: c.student_count ?? c.students ?? undefined,
        my_rating: c.my_rating ?? c.rating ?? undefined,
      })).filter(c => c.id != null);
      setCourses(normalized);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmitRating = async ({ rating, comment, academicYear, semester, lecturerId }) => {
    if (!ratingFor) return;
    if (!lecturerId) { toast.error('Please select a lecturer'); return; }
    try {
      await apiService.users.rateClass({
        courseId: ratingFor.id,
        rating: Number(rating),
        comments: comment || undefined,
        academicYear: academicYear || String(new Date().getFullYear()),
        semester: Number(semester || 1),
        lecturerId: Number(lecturerId),
        classDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Thank you for your rating');
      setRatingFor(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to submit rating');
    }
  };

  // Load lecturers for course when opening rating modal
  useEffect(() => {
    const fetchLecturers = async () => {
      if (!ratingFor?.id) { setLecturers([]); return; }
      try {
        const { data } = await apiService.users.getLecturersByCourse(ratingFor.id);
        const list = Array.isArray(data?.lecturers) ? data.lecturers : [];
        // De-duplicate by id to avoid duplicate keys
        const seen = new Set();
        const deduped = list.filter(l => {
          const key = l.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setLecturers(deduped);
      } catch (_) {
        setLecturers([]);
      }
    };
    fetchLecturers();
  }, [ratingFor]);

  if (loading) return <div className="container py-4"><Spinner /></div>;
  if (error) return <div className="container py-4"><Alert variant="danger">{error}</Alert></div>;

  return (
    <div className="container py-4">
      <h2 className="mb-3">My Classes</h2>
      <Card>
        <Card.Body>
          {courses.length === 0 ? (
            <div className="text-muted">No classes to show.</div>
          ) : (
            <Table responsive hover>
              <thead className="table-light">
                <tr>
                  <th>Course</th>
                  <th>Code</th>
                  <th>Lecturer</th>
                  <th>Your Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>{c.course_name}</td>
                    <td>{c.course_code}</td>
                    <td>{c.lecturer_name || c.lecturer || '—'}</td>
                    <td>
                      {c.my_rating ? (
                        <span title={`${Number(c.my_rating).toFixed(1)} / 5`}>
                          {[1,2,3,4,5].map(i => (
                            <i key={i} className={`bi ${i <= Math.round(c.my_rating) ? 'bi-star-fill text-warning' : 'bi-star text-warning'}`} style={{ fontSize: 14, marginRight: 2 }} />
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted">Not rated</span>
                      )}
                    </td>
                    <td>
                      <Button size="sm" variant="outline-primary" onClick={() => setRatingFor(c)} disabled={!!c.my_rating}>
                        {c.my_rating ? 'Rated' : 'Rate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <RatingModal
        show={!!ratingFor}
        onHide={() => setRatingFor(null)}
        onSubmit={handleSubmitRating}
        initial={{ rating: ratingFor?.my_rating || 0, comment: '' }}
        lecturers={lecturers}
      />
    </div>
  );
}

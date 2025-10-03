import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Badge, Button, Spinner, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

export default function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fbSaving, setFbSaving] = useState(false);
  const [fbType, setFbType] = useState('suggestion');
  const [fbContent, setFbContent] = useState('');
  const [lecturers, setLecturers] = useState([]);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingLecturer, setRatingLecturer] = useState('');
  const [ratingComments, setRatingComments] = useState('');
  const [manualRating, setManualRating] = useState('');
  const [manualRatingSaving, setManualRatingSaving] = useState(false);
  const [moderating, setModerating] = useState(false);

  const canUpload = () => {
    if (!user || !report) return false;
    const elevated = ['admin','faculty_manager','principal_lecturer','program_leader'];
    return report.reporter_id === user.id || elevated.includes(user.role);
  };

  const canGiveFeedback = () => {
    if (!user || !report) return false;
    const elevated = ['admin','faculty_manager','principal_lecturer','program_leader','lecturer'];
    // Prevent reporter from giving feedback on their own report
    return elevated.includes(user.role) && report.reporter_id !== user.id;
  };

  const onSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!fbContent.trim()) {
      toast.error('Feedback content is required');
      return;
    }
    try {
      setFbSaving(true);
      await apiService.reports.addFeedback(id, { content: fbContent.trim(), feedbackType: fbType });
      toast.success('Feedback submitted');
      setFbContent('');
      // Reload to get updated status and feedback list
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setFbSaving(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [repRes, attRes] = await Promise.all([
        apiService.reports.getById(id),
        apiService.reports.listAttachments(id)
      ]);
      setReport(repRes.data?.report || repRes.data);
      setFeedback(repRes.data?.feedback || []);
      setAttachments(attRes.data?.files || []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    const loadLecturers = async () => {
      try {
        if (report?.course_id) {
          const { data } = await apiService.users.getLecturersByCourse(report.course_id);
          setLecturers(data?.lecturers || []);
        } else {
          setLecturers([]);
        }
      } catch (_) {
        setLecturers([]);
      }
    };
    loadLecturers();
  }, [report?.course_id]);

  // Sync manualRating state when report loads (must be declared before conditional returns)
  useEffect(() => {
    if (report?.rating != null) {
      setManualRating(String(report.rating));
    }
  }, [report?.rating]);

  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const max = 5 * 1024 * 1024;
    const allowed = ['image/png','image/jpeg','application/pdf','text/plain'];
    const bad = files.find(f => f.size > max || !allowed.includes(f.type));
    if (bad) {
      toast.error('Files must be PNG/JPEG/PDF/TXT and <= 5MB each');
      return;
    }
    try {
      setUploading(true);
      const form = new FormData();
      files.forEach(f => form.append('files', f));
      await apiService.reports.uploadAttachments(id, form);
      toast.success('Attachments uploaded');
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to upload attachments');
    } finally {
      setUploading(false);
      // reset value so same files can be reselected if needed
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="container py-4"><Spinner /></div>
    );
  }

  if (error) {
    return (
      <div className="container py-4"><Alert variant="danger">{error}</Alert></div>
    );
  }

  if (!report) return null;

  return (
    <div className="container py-4">
      {/* Header */}
      <Row className="mb-3">
        <Col>
          <h2 className="mb-1">{report.title}</h2>
          <div className="text-muted small">Created {new Date(report.created_at).toLocaleString()}</div>
        </Col>
        <Col className="text-md-end">
          <div className="d-flex gap-2 justify-content-md-end">
            <Badge bg="secondary">{report.course_name || 'No course'}</Badge>
            <Badge bg={report.status === 'approved' ? 'success' : report.status === 'rejected' ? 'danger' : report.status === 'submitted' ? 'primary' : 'secondary'}>
              {report.status?.toUpperCase()}
            </Badge>
          </div>
          {report.reporter_id === user?.id && report.status === 'draft' && (
            <div className="mt-2 d-flex justify-content-md-end">
              <div className="me-2 text-muted small d-flex align-items-center">
                Will be submitted to {user?.role === 'student' ? 'LECTURER' : 'PROGRAM_LEADER'}
              </div>
              <Button size="sm" variant="primary" disabled={moderating} onClick={async () => {
                const targetRole = user?.role === 'student' ? 'LECTURER' : 'PROGRAM_LEADER';
                const ok = window.confirm(`Submit this draft for review to ${targetRole}?`);
                if (!ok) return;
                try {
                  setModerating(true);
                  await apiService.reports.submit(id);
                  toast.success(`Report submitted to ${targetRole}`);
                  await loadData();
                } catch (err) {
                  toast.error(err?.response?.data?.error || 'Failed to submit report');
                } finally {
                  setModerating(false);
                }
              }}>
                <i className="bi bi-send-fill me-1"></i>
                Submit
              </Button>
            </div>
          )}
          {report.rating ? (
            <div className="mt-2 d-flex justify-content-md-end align-items-center" title={`${report.rating} / 5`}>
              {[1,2,3,4,5].map(i => (
                <i key={i} className={`bi ${i <= report.rating ? 'bi-star-fill text-warning' : 'bi-star text-warning'}`} style={{ fontSize: 16, marginLeft: 2 }} />
              ))}
            </div>
          ) : null}
          {['admin','faculty_manager','principal_lecturer','program_leader'].includes(user?.role) && report.reporter_id !== user?.id && !['approved','rejected'].includes(report.status) && (
            <div className="mt-2 d-flex gap-2 justify-content-md-end">
              <Button size="sm" variant="success" disabled={moderating} onClick={async () => {
                try {
                  setModerating(true);
                  await apiService.reports.moderate(id, { status: 'approved' });
                  toast.success('Report approved');
                  await loadData();
                } catch (err) {
                  toast.error(err?.response?.data?.error || 'Failed to approve');
                } finally {
                  setModerating(false);
                }
              }}>
                <i className="bi bi-check2-circle me-1"></i>
                Approve
              </Button>
              <Button size="sm" variant="outline-secondary" disabled={moderating} onClick={async () => {
                try {
                  setModerating(true);
                  await apiService.reports.moderate(id, { status: 'reviewed' });
                  toast.success('Report marked as reviewed');
                  await loadData();
                } catch (err) {
                  toast.error(err?.response?.data?.error || 'Failed to mark reviewed');
                } finally {
                  setModerating(false);
                }
              }}>
                <i className="bi bi-eye me-1"></i>
                Mark Reviewed
              </Button>
              <Button size="sm" variant="outline-danger" disabled={moderating} onClick={async () => {
                try {
                  setModerating(true);
                  await apiService.reports.moderate(id, { status: 'rejected' });
                  toast.success('Report rejected');
                  await loadData();
                } catch (err) {
                  toast.error(err?.response?.data?.error || 'Failed to reject');
                } finally {
                  setModerating(false);
                }
              }}>
                <i className="bi bi-x-circle me-1"></i>
                Reject
              </Button>
              <Button size="sm" variant="outline-warning" disabled={moderating} onClick={async () => {
                const val = window.prompt('Set rating (1-5)');
                const n = Number(val);
                if (val === null) return;
                if (!Number.isInteger(n) || n < 1 || n > 5) {
                  toast.error('Invalid rating');
                  return;
                }
                try {
                  setModerating(true);
                  await apiService.reports.moderate(id, { rating: n });
                  toast.success('Rating updated');
                  await loadData();
                } catch (err) {
                  toast.error(err?.response?.data?.error || 'Failed to set rating');
                } finally {
                  setModerating(false);
                }
              }}>
                <i className="bi bi-star-half me-1"></i>
                Set Rating
              </Button>
            </div>
          )}
        </Col>
      </Row>

      {/* Body */}
      <Row>
        <Col md={8} className="mb-3">
          <Card>
            <Card.Header>
              <strong>Content</strong>
            </Card.Header>
            <Card.Body style={{ whiteSpace: 'pre-wrap' }}>
              {report.content}
            </Card.Body>
          </Card>

          {['admin','faculty_manager','principal_lecturer','program_leader'].includes(user?.role) && (
            <Card className="mb-3 mt-3">
              <Card.Header>
                <strong>Manual Rating</strong>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    setManualRatingSaving(true);
                    await apiService.reports.moderate(id, { rating: Number(manualRating || 0) });
                    toast.success('Rating updated');
                    await loadData();
                  } catch (err) {
                    toast.error(err?.response?.data?.error || 'Failed to update rating');
                  } finally {
                    setManualRatingSaving(false);
                  }
                }}>
                  <Form.Group className="mb-3">
                    <Form.Label>Set Rating (1-5)</Form.Label>
                    <Form.Select value={manualRating} onChange={(e) => setManualRating(e.target.value)} disabled={manualRatingSaving}>
                      <option value="">Select</option>
                      {[5,4,3,2,1].map(v => (<option key={v} value={v}>{v}</option>))}
                    </Form.Select>
                  </Form.Group>
                  <div className="d-flex justify-content-end">
                    <Button type="submit" variant="warning" disabled={manualRatingSaving || !manualRating}>
                      {manualRatingSaving ? 'Saving...' : 'Save Rating'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}

          <Card className="mt-3">
            <Card.Header>
              <strong>Feedback</strong>
            </Card.Header>
            <Card.Body>
              {Array.isArray(feedback) && feedback.length > 0 ? (
                <ul className="list-unstyled">
                  {feedback.map((f) => (
                    <li key={f.id} className="mb-3">
                      <div className="d-flex justify-content-between">
                        <div>
                          <Badge bg="secondary" className="me-2">{f.feedback_type}</Badge>
                          <strong>{f.from_first_name} {f.from_last_name}</strong>
                          <span className="text-muted ms-2 small">to {f.to_first_name} {f.to_last_name}</span>
                        </div>
                        <small className="text-muted">{new Date(f.created_at).toLocaleString()}</small>
                      </div>
                      <div className="mt-1" style={{ whiteSpace: 'pre-wrap' }}>{f.feedback_content}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted">No feedback yet</div>
              )}

              {canGiveFeedback() && (
                <Form onSubmit={onSubmitFeedback} className="mt-3">
                  <Row className="g-2 align-items-end">
                    <Col md={3}>
                      <Form.Label>Type</Form.Label>
                      <Form.Select value={fbType} onChange={(e) => setFbType(e.target.value)} disabled={fbSaving}>
                        <option value="approval">Approval</option>
                        <option value="rejection">Rejection</option>
                        <option value="suggestion">Suggestion</option>
                        <option value="clarification">Clarification</option>
                      </Form.Select>
                    </Col>
                    <Col md={9}>
                      <Form.Label>Feedback</Form.Label>
                      <Form.Control as="textarea" rows={3} value={fbContent} onChange={(e) => setFbContent(e.target.value)} disabled={fbSaving} placeholder="Write your feedback..." />
                    </Col>
                  </Row>
                  <div className="mt-2 d-flex justify-content-end">
                    <Button type="submit" variant="primary" disabled={fbSaving}>{fbSaving ? 'Submitting...' : 'Submit Feedback'}</Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="mb-3">
            <Card.Header>
              <strong>Attachments</strong>
            </Card.Header>
            <Card.Body>
              {attachments.length === 0 ? (
                <div className="text-muted">No attachments</div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {attachments.map((f, idx) => (
                    <li key={idx} className="d-flex justify-content-between align-items-center mb-2">
                      <a href={f.url} target="_blank" rel="noreferrer" className="text-decoration-none">
                        <i className="bi bi-paperclip me-1"></i>
                        {f.filename}
                      </a>
                      <small className="text-muted">{Math.ceil(f.size/1024)} KB</small>
                    </li>
                  ))}
                </ul>
              )}

              {canUpload() && (
                <Form.Group className="mt-3">
                  <Form.Label className="btn btn-outline-primary">
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </Form.Label>
                  <Form.Control type="file" multiple onChange={onUpload} hidden disabled={uploading} />
                </Form.Group>
              )}
            </Card.Body>
          </Card>

          {user?.role === 'student' && report?.course_id && (
            <Card>
              <Card.Header>
                <strong>Rate This Class</strong>
              </Card.Header>
              <Card.Body>
                {lecturers.length === 0 ? (
                  <div className="text-muted">No lecturers assigned to this course</div>
                ) : (
                  <Form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!ratingLecturer) {
                      toast.error('Please select a lecturer');
                      return;
                    }
                    try {
                      setRatingSaving(true);
                      await apiService.users.rateClass({
                        courseId: report.course_id,
                        lecturerId: Number(ratingLecturer),
                        rating: Number(ratingValue),
                        comments: ratingComments,
                        classDate: new Date().toISOString().split('T')[0],
                      });
                      toast.success('Thank you for your rating');
                      setRatingComments('');
                    } catch (err) {
                      toast.error(err?.response?.data?.error || 'Failed to submit rating');
                    } finally {
                      setRatingSaving(false);
                    }
                  }}>
                    <Form.Group className="mb-2">
                      <Form.Label>Lecturer</Form.Label>
                      <Form.Select value={ratingLecturer} onChange={(e) => setRatingLecturer(e.target.value)} disabled={ratingSaving}>
                        <option value="">Select lecturer</option>
                        {lecturers.map(l => (
                          <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Rating</Form.Label>
                      <Form.Select value={ratingValue} onChange={(e) => setRatingValue(e.target.value)} disabled={ratingSaving}>
                        {[5,4,3,2,1].map(v => (<option key={v} value={v}>{v}</option>))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Comments (optional)</Form.Label>
                      <Form.Control as="textarea" rows={3} value={ratingComments} onChange={(e) => setRatingComments(e.target.value)} disabled={ratingSaving} />
                    </Form.Group>
                    <div className="d-flex justify-content-end">
                      <Button type="submit" variant="success" disabled={ratingSaving}>{ratingSaving ? 'Submitting...' : 'Submit Rating'}</Button>
                    </div>
                  </Form>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}

import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

export default function RatingModal({ show, onHide, onSubmit, initial = {}, lecturers = [] }) {
  const [rating, setRating] = useState(initial.rating || 0);
  const [comment, setComment] = useState(initial.comment || '');
  const [academicYear, setAcademicYear] = useState(initial.academicYear || String(new Date().getFullYear()));
  const [semester, setSemester] = useState(initial.semester || 1);
  const [lecturerId, setLecturerId] = useState(initial.lecturerId || '');

  const setStar = (value) => {
    setRating(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) return;
    if (lecturers.length > 0 && !lecturerId) return;
    onSubmit({ rating, comment, academicYear, semester, lecturerId: lecturerId ? Number(lecturerId) : undefined });
  };

  return (
    <Modal show={show} onHide={onHide} centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Rate this class</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {lecturers.length > 0 && (
            <div className="row g-3 mb-3">
              <div className="col-12">
                <Form.Group>
                  <Form.Label>Lecturer</Form.Label>
                  <Form.Select value={lecturerId} onChange={(e) => setLecturerId(e.target.value)}>
                    <option value="">Select lecturer</option>
                    {lecturers.map(l => (
                      <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
          )}
          <div className="d-flex align-items-center mb-3" role="group" aria-label="Star rating">
            {[1,2,3,4,5].map(i => (
              <i
                key={i}
                className={`bi ${i <= rating ? 'bi-star-fill text-warning' : 'bi-star text-warning'}`}
                style={{ fontSize: 28, cursor: 'pointer', marginRight: 6 }}
                onClick={() => setStar(i)}
                aria-label={`${i} star`}
              />
            ))}
          </div>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Academic Year</Form.Label>
                <Form.Control value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Semester</Form.Label>
                <Form.Select value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
                  {[1,2,3,4,5,6,7,8].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
          </div>
          <Form.Group>
            <Form.Label>Comments (optional)</Form.Label>
            <Form.Control as="textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well? What could improve?" />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!rating}>Submit Rating</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';

// Local storage key for caching registered student counts by course code
const LS_REGISTERED_STUDENTS_KEY = 'registered_students_by_course_code_v1';

const getRegisteredMap = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_REGISTERED_STUDENTS_KEY) || '{}');
  } catch {
    return {};
  }
};

const setRegisteredForCourse = (courseCode, total) => {
  const map = getRegisteredMap();
  if (!courseCode) return;
  map[String(courseCode).toUpperCase()] = Number(total) || 0;
  localStorage.setItem(LS_REGISTERED_STUDENTS_KEY, JSON.stringify(map));
};

const getRegisteredForCourse = (courseCode) => {
  const map = getRegisteredMap();
  if (!courseCode) return undefined;
  const key = String(courseCode).toUpperCase();
  return map[key];
};

export default function LecturerReportForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Form state
  const [form, setForm] = useState({
    facultyName: '',
    className: '',
    weekOfReporting: '',
    dateOfLecture: '',
    courseId: '',
    courseName: '',
    courseCode: '',
    lecturerName: '',
    actualStudentsPresent: '',
    totalRegisteredStudents: '',
    venue: '',
    scheduledLectureTime: '',
    topicTaught: '',
    learningOutcomes: '',
    recommendations: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Prefill lecturer name from profile
  useEffect(() => {
    if (user?.firstName || user?.lastName) {
      setForm((f) => ({
        ...f,
        lecturerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      }));
    }
  }, [user]);

  // Load courses to assist selection (optional)
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCourses(true);
        const { data } = await apiService.users.getAvailableCourses();
        // API returns { courses: [...] }. Fallback if array provided directly.
        const list = Array.isArray(data) ? data : (data?.courses || []);
        setCourses(Array.isArray(list) ? list : []);
      } catch (_) {
        // optional helper, non-fatal
      } finally {
        setLoadingCourses(false);
      }
    };
    load();
  }, []);

  // Auto-retrieve total registered when course code changes
  useEffect(() => {
    if (form.courseCode) {
      const saved = getRegisteredForCourse(form.courseCode);
      if (typeof saved === 'number' && saved > 0) {
        setForm((f) => ({ ...f, totalRegisteredStudents: String(saved) }));
      }
    }
  }, [form.courseCode]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.facultyName.trim()) e.facultyName = 'Faculty Name is required';
    if (!form.className.trim()) e.className = 'Class Name is required';
    if (!form.weekOfReporting) e.weekOfReporting = 'Week of Reporting is required';
    if (!form.dateOfLecture) e.dateOfLecture = 'Date of Lecture is required';
    if (!form.courseId) e.courseId = 'Please select a Course';
    if (!form.courseName.trim()) e.courseName = 'Course Name is required';
    if (!form.courseCode.trim()) e.courseCode = 'Course Code is required';
    if (!form.lecturerName.trim()) e.lecturerName = "Lecturer's Name is required";

    const present = Number(form.actualStudentsPresent);
    if (!form.actualStudentsPresent) e.actualStudentsPresent = 'Actual number present is required';
    else if (!Number.isFinite(present) || present < 0) e.actualStudentsPresent = 'Enter a valid non-negative number';

    const total = Number(form.totalRegisteredStudents);
    if (form.totalRegisteredStudents === '') e.totalRegisteredStudents = 'Total Registered Students is required';
    else if (!Number.isFinite(total) || total <= 0) e.totalRegisteredStudents = 'Enter a valid positive number';
    else if (Number.isFinite(present) && present > total) e.actualStudentsPresent = 'Present cannot exceed total registered';

    if (!form.venue.trim()) e.venue = 'Venue is required';
    if (!form.scheduledLectureTime) e.scheduledLectureTime = 'Scheduled Lecture Time is required';
    if (!form.topicTaught.trim()) e.topicTaught = 'Topic Taught is required';
    if (!form.learningOutcomes.trim()) e.learningOutcomes = 'Learning Outcomes are required';
    // recommendations can be optional, but we include if desired

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    try {
      setSubmitting(true);

      // Persist total registered students for future auto-fill by course code
      if (form.courseCode && form.totalRegisteredStudents) {
        setRegisteredForCourse(form.courseCode, Number(form.totalRegisteredStudents));
      }

      // Build payload aligned to existing API while including detailed fields
      const payload = {
        reportType: 'lecturer_report',
        title: `${form.courseCode} • ${form.topicTaught}`,
        description: [
          `Faculty: ${form.facultyName}`,
          `Class: ${form.className}`,
          `Week: ${form.weekOfReporting}`,
          `Date of Lecture: ${form.dateOfLecture}`,
          `Course: ${form.courseName} (${form.courseCode})`,
          `Lecturer: ${form.lecturerName}`,
          `Students Present: ${form.actualStudentsPresent} / ${form.totalRegisteredStudents}`,
          `Venue: ${form.venue}`,
          `Scheduled Time: ${form.scheduledLectureTime}`,
          `Topic Taught: ${form.topicTaught}`,
          `Learning Outcomes: ${form.learningOutcomes}`,
          `Recommendations: ${form.recommendations || 'N/A'}`,
        ].join('\n'),
        // Associate selected course (required by backend for lecturer)
        courseId: Number(form.courseId),
        details: {
          facultyName: form.facultyName,
          className: form.className,
          weekOfReporting: form.weekOfReporting,
          dateOfLecture: form.dateOfLecture,
          courseName: form.courseName,
          courseCode: form.courseCode,
          lecturerName: form.lecturerName,
          actualStudentsPresent: Number(form.actualStudentsPresent),
          totalRegisteredStudents: Number(form.totalRegisteredStudents),
          venue: form.venue,
          scheduledLectureTime: form.scheduledLectureTime,
          topicTaught: form.topicTaught,
          learningOutcomes: form.learningOutcomes,
          recommendations: form.recommendations,
        },
      };

      await apiService.reports.create(payload);
      toast.success('Lecturer report submitted');
      navigate('/reports');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to submit lecturer report';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      <h1 className="mb-3">Data Entry (Lecturer Reporting Form)</h1>
      <Card>
        <Card.Body>
          {formError && <Alert variant="danger">{formError}</Alert>}

          <Form onSubmit={onSubmit}>
            {/* Course selection (required) */}
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Course</Form.Label>
                  <Form.Select
                    name="courseId"
                    value={form.courseId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((f) => ({ ...f, courseId: value }));
                      if (errors.courseId) setErrors((prev) => ({ ...prev, courseId: '' }));
                      const found = courses.find((c) => String(c.id) === value);
                      if (found) {
                        setForm((f) => ({
                          ...f,
                          courseId: String(found.id),
                          courseName: found.course_name || found.name || f.courseName,
                          courseCode: found.course_code || f.courseCode,
                        }));
                      }
                    }}
                    disabled={loadingCourses}
                    isInvalid={!!errors.courseId}
                  >
                    <option value="">{loadingCourses ? 'Loading courses...' : 'Select a course'}</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_name || c.name}
                        {c.course_code ? ` (${c.course_code})` : ''}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.courseId}</Form.Control.Feedback>
                  {!loadingCourses && courses.length === 0 && (
                    <Form.Text className="text-warning">No courses available. Please contact your Program Leader.</Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Faculty Name</Form.Label>
                  <Form.Control name="facultyName" value={form.facultyName} onChange={onChange} isInvalid={!!errors.facultyName} />
                  <Form.Control.Feedback type="invalid">{errors.facultyName}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Class Name</Form.Label>
                  <Form.Control name="className" value={form.className} onChange={onChange} isInvalid={!!errors.className} />
                  <Form.Control.Feedback type="invalid">{errors.className}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Week of Reporting</Form.Label>
                  <Form.Control type="week" name="weekOfReporting" value={form.weekOfReporting} onChange={onChange} isInvalid={!!errors.weekOfReporting} />
                  <Form.Control.Feedback type="invalid">{errors.weekOfReporting}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date of Lecture</Form.Label>
                  <Form.Control type="date" name="dateOfLecture" value={form.dateOfLecture} onChange={onChange} isInvalid={!!errors.dateOfLecture} />
                  <Form.Control.Feedback type="invalid">{errors.dateOfLecture}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Course Name</Form.Label>
                  <InputGroup>
                    <Form.Control name="courseName" value={form.courseName} onChange={onChange} isInvalid={!!errors.courseName} />
                    <Form.Control readOnly value={form.courseId ? 'Selected from list' : ''} placeholder="" style={{ maxWidth: 180 }} />
                  </InputGroup>
                  <Form.Control.Feedback type="invalid">{errors.courseName}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Course Code</Form.Label>
                  <Form.Control name="courseCode" value={form.courseCode} onChange={onChange} isInvalid={!!errors.courseCode} />
                  <Form.Control.Feedback type="invalid">{errors.courseCode}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Lecturer’s Name</Form.Label>
                  <Form.Control name="lecturerName" value={form.lecturerName} onChange={onChange} isInvalid={!!errors.lecturerName} />
                  <Form.Control.Feedback type="invalid">{errors.lecturerName}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Actual Students Present</Form.Label>
                  <Form.Control type="number" min={0} name="actualStudentsPresent" value={form.actualStudentsPresent} onChange={onChange} isInvalid={!!errors.actualStudentsPresent} />
                  <Form.Control.Feedback type="invalid">{errors.actualStudentsPresent}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Total Registered Students</Form.Label>
                  <Form.Control type="number" min={1} name="totalRegisteredStudents" value={form.totalRegisteredStudents} onChange={onChange} isInvalid={!!errors.totalRegisteredStudents} />
                  <Form.Text className="text-muted">Auto-filled for known course codes.</Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.totalRegisteredStudents}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Venue of the Class</Form.Label>
                  <Form.Control name="venue" value={form.venue} onChange={onChange} isInvalid={!!errors.venue} />
                  <Form.Control.Feedback type="invalid">{errors.venue}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Scheduled Lecture Time</Form.Label>
                  <Form.Control type="time" name="scheduledLectureTime" value={form.scheduledLectureTime} onChange={onChange} isInvalid={!!errors.scheduledLectureTime} />
                  <Form.Control.Feedback type="invalid">{errors.scheduledLectureTime}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Topic Taught</Form.Label>
              <Form.Control name="topicTaught" value={form.topicTaught} onChange={onChange} isInvalid={!!errors.topicTaught} />
              <Form.Control.Feedback type="invalid">{errors.topicTaught}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Learning Outcomes of the Topic</Form.Label>
              <Form.Control as="textarea" rows={4} name="learningOutcomes" value={form.learningOutcomes} onChange={onChange} isInvalid={!!errors.learningOutcomes} />
              <Form.Control.Feedback type="invalid">{errors.learningOutcomes}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Lecturer’s Recommendations</Form.Label>
              <Form.Control as="textarea" rows={3} name="recommendations" value={form.recommendations} onChange={onChange} />
            </Form.Group>

            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Lecturer Report'}
              </Button>
              <Button variant="outline-secondary" onClick={() => navigate(-1)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Button, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiService } from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import './Auth.css';

const Register = () => {
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'student',
    streamId: '',
    courseId: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState('');
  const [streams, setStreams] = useState([]);
  const [courses, setCourses] = useState([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Load streams and optionally courses
  const loadStreams = async () => {
    try {
      const { data } = await apiService.users.getPublicStreams();
      setStreams(data?.streams || []);
    } catch (_) {
      setStreams([]);
    }
  };

  const loadCourses = async (streamId) => {
    try {
      const { data } = await apiService.users.getPublicCourses({ stream_id: streamId });
      setCourses(data?.courses || []);
    } catch (_) {
      setCourses([]);
    }
  };

  useEffect(() => {
    loadStreams();
  }, []);

  useEffect(() => {
    if (formData.streamId) {
      loadCourses(formData.streamId);
    }
  }, [formData.streamId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // When stream changes, reset course and reload courses list
    if (name === 'streamId') {
      setFormData(prev => ({ ...prev, courseId: '' }));
      if (value) {
        loadCourses(value).catch(() => {});
      } else {
        setCourses([]);
      }
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Name validations
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    // Faculty/Course validation for student or lecturer
    const needsAcademic = formData.role === 'student' || formData.role === 'lecturer';
    if (needsAcademic) {
      if (!String(formData.streamId || '').trim()) {
        newErrors.streamId = 'Please select your faculty';
      }
      if (!String(formData.courseId || '').trim()) {
        newErrors.courseId = 'Please select your course';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        // ensure numbers are sent for IDs if present
        streamId: formData.streamId ? Number(formData.streamId) : undefined,
        courseId: formData.courseId ? Number(formData.courseId) : undefined,
      };
      const result = await register(payload);
      
      if (result.success) {
        navigate('/', { replace: true });
      } else if (result.message) {
        setFormError(result.message);
      }
    } catch (error) {
      const message = error?.response?.data?.error || 'Registration failed. Please review your details and try again.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="auth-container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join the Faculty Reporting System"
      footer={
        <p className="mb-0">
          Already have an account?{' '}
          <Link to="/login" className="text-decoration-none">
            Sign in here
          </Link>
        </p>
      }
    >
      {formError && (
        <Alert variant="danger" className="py-2" role="alert">{formError}</Alert>
      )}

      {/* Registration Form */}
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>First Name *</Form.Label>
              <Form.Control
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                isInvalid={!!errors.firstName}
                disabled={isSubmitting}
                autoComplete="given-name"
              />
              <Form.Control.Feedback type="invalid">
                {errors.firstName}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Last Name *</Form.Label>
              <Form.Control
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                isInvalid={!!errors.lastName}
                disabled={isSubmitting}
                autoComplete="family-name"
              />
              <Form.Control.Feedback type="invalid">
                {errors.lastName}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>
            <i className="bi bi-person me-2"></i>
            Username *
          </Form.Label>
          <Form.Control
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Choose a username"
            isInvalid={!!errors.username}
            disabled={isSubmitting}
            autoComplete="username"
          />
          <Form.Control.Feedback type="invalid">
            {errors.username}
          </Form.Control.Feedback>
          <Form.Text className="text-muted">
            Only letters, numbers, and underscores allowed
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>
            <i className="bi bi-envelope me-2"></i>
            Email Address *
          </Form.Label>
          <Form.Control
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
            isInvalid={!!errors.email}
            disabled={isSubmitting}
            autoComplete="email"
          />
          <Form.Control.Feedback type="invalid">
            {errors.email}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>
            <i className="bi bi-telephone me-2"></i>
            Phone Number (Optional)
          </Form.Label>
          <Form.Control
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
            disabled={isSubmitting}
            autoComplete="tel"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>
            <i className="bi bi-person-badge me-2"></i>
            Role *
          </Form.Label>
          <Form.Select
            name="role"
            value={formData.role}
            onChange={handleChange}
            isInvalid={!!errors.role}
            disabled={isSubmitting}
          >
            <option value="">Select your role</option>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="program_leader">Program Leader</option>
            <option value="principal_lecturer">Principal Lecturer</option>
            <option value="faculty_manager">Faculty Manager</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">
            {errors.role}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Faculty and Course selection for Student/Lecturer */}
        {(formData.role === 'student' || formData.role === 'lecturer') && (
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Faculty *</Form.Label>
                <Form.Select
                  name="streamId"
                  value={formData.streamId || ''}
                  onChange={handleChange}
                  isInvalid={!!errors.streamId}
                  disabled={isSubmitting}
                >
                  <option value="">Select faculty</option>
                  {streams.map(s => (
                    <option key={s.id} value={s.id}>{s.stream_name}</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.streamId}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Course *</Form.Label>
                <Form.Select
                  name="courseId"
                  value={formData.courseId || ''}
                  onChange={handleChange}
                  isInvalid={!!errors.courseId}
                  disabled={isSubmitting || !formData.streamId}
                >
                  <option value="">Select course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.course_name} ({c.course_code})</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.courseId}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
        )}

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-lock me-2"></i>
                Password *
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create password"
                  isInvalid={!!errors.password}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <Button variant="outline-secondary" onClick={() => setShowPassword((s) => !s)} tabIndex={-1}>
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </Button>
              </InputGroup>
              <Form.Control.Feedback type="invalid">
                {errors.password}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-4">
              <Form.Label>
                <i className="bi bi-lock-fill me-2"></i>
                Confirm Password *
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  isInvalid={!!errors.confirmPassword}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <Button variant="outline-secondary" onClick={() => setShowConfirm((s) => !s)} tabIndex={-1}>
                  <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </Button>
              </InputGroup>
              <Form.Control.Feedback type="invalid">
                {errors.confirmPassword}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Button
          variant="primary"
          type="submit"
          className="w-100 mb-3"
          disabled={isSubmitting}
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              Creating Account...
            </>
          ) : (
            <>
              <i className="bi bi-person-plus me-2"></i>
              Create Account
            </>
          )}
        </Button>
      </Form>
    </AuthLayout>
  );
};

export default Register;

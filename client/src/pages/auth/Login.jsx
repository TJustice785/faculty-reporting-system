import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import './Auth.css';

const Login = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Prefill remembered username
  useEffect(() => {
    const saved = localStorage.getItem('remember_username');
    if (saved && !formData.username) {
      setFormData((prev) => ({ ...prev, username: saved }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
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

    if (!formData.username.trim()) {
      newErrors.username = 'Username or email is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      const result = await login(formData);
      
      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('remember_username', formData.username);
        } else {
          localStorage.removeItem('remember_username');
        }
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else if (result.message) {
        setErrors((prev) => ({ ...prev, form: result.message }));
      }
    } catch (error) {
      const message = error?.response?.data?.error || 'Failed to sign in. Please check your credentials and try again.';
      setErrors((prev) => ({ ...prev, form: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="auth-container d-flex justify-content-center align-items-center">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account"
      footer={
        <p className="mb-0">
          Don't have an account?{' '}
          <Link to="/register" className="text-decoration-none">
            Sign up here
          </Link>
        </p>
      }
    >
      {errors.form && (
        <Alert variant="danger" className="py-2" role="alert">
          {errors.form}
        </Alert>
      )}

      {/* Login Form */}
      <Form onSubmit={handleSubmit} noValidate>
        <Form.Group className="mb-3">
          <Form.Label>
            <i className="bi bi-person me-2"></i>
            Username or Email
          </Form.Label>
          <Form.Control
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your username or email"
            isInvalid={!!errors.username}
            disabled={isSubmitting}
            autoComplete="username"
            inputMode="email"
          />
          <Form.Control.Feedback type="invalid">
            {errors.username}
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>
            <i className="bi bi-lock me-2"></i>
            Password
          </Form.Label>
          <InputGroup>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              isInvalid={!!errors.password}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </Button>
          </InputGroup>
          <Form.Control.Feedback type="invalid">
            {errors.password}
          </Form.Control.Feedback>
        </Form.Group>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <Form.Check
            type="checkbox"
            id="rememberMe"
            label="Remember me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="small text-muted">Use your assigned credentials</span>
        </div>

        <Button
          variant="primary"
          type="submit"
          className="w-100 mb-3"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              Signing In...
            </>
          ) : (
            <>
              <i className="bi bi-box-arrow-in-right me-2"></i>
              Sign In
            </>
          )}
        </Button>
      </Form>

      {/* Demo Accounts Alert */}
      <Alert variant="info" className="small">
        <strong>Demo Accounts (Password: Password123):</strong><br />
        <div className="mt-2">
          <div><strong>Admin:</strong> admin1 or admin1@example.com</div>
          <div><strong>Faculty Manager:</strong> fm1 or fm1@example.com</div>
          <div><strong>Program Leader:</strong> pl1 or pl1@example.com</div>
          <div><strong>Lecturer:</strong> lecturer1 or lecturer1@example.com</div>
          <div><strong>Student:</strong> student1 or student1@example.com</div>
        </div>
      </Alert>
    </AuthLayout>
  );
};

export default Login;

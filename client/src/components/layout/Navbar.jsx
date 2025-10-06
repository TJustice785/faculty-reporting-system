import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar as BootstrapNavbar, Nav, NavDropdown, Container, Badge } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuery, useQueryClient } from 'react-query';
import { apiService } from '../../services/api';
import './Navbar.css';
import Logo from '../common/Logo.jsx';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [theme, setTheme] = useState('');
  const queryClient = useQueryClient();

  // Theme initialization and persistence
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    let initial = saved;
    if (!initial) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      initial = prefersDark ? 'dark' : 'light';
    }
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  // Get unread notifications count (lightweight)
  const { data: notifCountData } = useQuery(
    'notifications-count',
    async () => {
      const res = await apiService.dashboard.getNotificationsCount();
      return res?.data ?? res;
    },
    {
      enabled: isAuthenticated,
      refetchInterval: 30000,
    }
  );

  // Get pending actions count (lightweight) for non-students
  const { data: pendingCountData } = useQuery(
    'pending-count',
    async () => {
      const res = await apiService.dashboard.getPendingCount();
      return res?.data ?? res;
    },
    {
      enabled: isAuthenticated && user?.role !== 'student',
      refetchInterval: 30000,
    }
  );

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setExpanded(false);
  };

  const handleNavClick = () => {
    setExpanded(false);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const unreadCount = notifCountData?.unread || 0;

  // Live notifications via SSE
  useEffect(() => {
    if (!isAuthenticated) return;
    let es;
    try {
      es = new EventSource('/api/notifications/stream');
      es.addEventListener('message', () => {
        // Invalidate notification-related queries
        queryClient.invalidateQueries('notifications-count');
        queryClient.invalidateQueries('notifications-page');
      });
    } catch (_) {}
    return () => { try { es && es.close(); } catch (_) {} };
  }, [isAuthenticated, queryClient]);

  return (
    <BootstrapNavbar 
      bg="dark" 
      variant="dark" 
      expand="lg" 
      sticky="top"
      expanded={expanded}
      onToggle={setExpanded}
      className="custom-navbar"
    >
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/" onClick={handleNavClick} className="d-flex align-items-center gap-2">
          <Logo size={28} rounded={true} alt="LUCT Logo" className="navbar-logo" />
          <span className="brand-text"><strong>LUCT</strong> Faculty Reporting</span>
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto d-lg-flex justify-content-lg-between">
            <Nav.Link 
              as={Link} 
              to="/" 
              onClick={handleNavClick}
              className={`${(isActive('/') && location.pathname === '/') ? 'active' : ''} my-1 my-lg-0`}
            >
              Dashboard
            </Nav.Link>

            {isAuthenticated && (
              <>
                {user?.role !== 'student' && (
                  <Nav.Link 
                    as={Link} 
                    to="/pending" 
                    onClick={handleNavClick}
                    className={`${isActive('/pending') ? 'active' : ''} my-1 my-lg-0`}
                  >
                    <i className="bi bi-inbox me-1"></i>
                    Pending
                    {(pendingCountData?.count || 0) > 0 && (
                      <Badge bg="warning" text="dark" className="ms-1">{pendingCountData.count}</Badge>
                    )}
                  </Nav.Link>
                )}

                {/* Admin direct link removed: admins land on role-aware Home ('/') */}

                <Nav.Link 
                  as={Link} 
                  to="/notifications" 
                  onClick={handleNavClick}
                  className={`${isActive('/notifications') ? 'active' : ''} my-1 my-lg-0`}
                >
                  <i className="bi bi-bell me-1"></i>
                  Notifications
                  {unreadCount > 0 && (
                    <Badge bg="danger" className="ms-1">{unreadCount}</Badge>
                  )}
                </Nav.Link>

                <Nav.Link 
                  as={Link} 
                  to="/reports" 
                  onClick={handleNavClick}
                  className={`${isActive('/reports') ? 'active' : ''} my-1 my-lg-0`}
                >
                  Reports
                  {user?.role === 'student' && unreadCount > 0 && (
                    <Badge bg="primary" className="ms-1">{unreadCount}</Badge>
                  )}
                </Nav.Link>

                {/* Student-specific navigation */}
                {user?.role === 'student' && (
                  <Nav.Link
                    as={Link}
                    to="/my-progress"
                    onClick={handleNavClick}
                    className={isActive('/my-progress') ? 'active' : ''}
                  >
                    My Progress
                  </Nav.Link>
                )}

                {user?.role === 'student' && (
                  <Nav.Link
                    as={Link}
                    to="/my-classes"
                    onClick={handleNavClick}
                    className={isActive('/my-classes') ? 'active' : ''}
                  >
                    My Classes
                  </Nav.Link>
                )}

                {user?.role === 'student' && (
                  <Nav.Link
                    as={Link}
                    to="/monitoring"
                    onClick={handleNavClick}
                    className={isActive('/monitoring') ? 'active' : ''}
                  >
                    Monitoring
                  </Nav.Link>
                )}

                {user?.role === 'student' && (
                  <Nav.Link
                    as={Link}
                    to="/rating"
                    onClick={handleNavClick}
                    className={isActive('/rating') ? 'active' : ''}
                  >
                    Rating
                  </Nav.Link>
                )}

                

                {/* Lecturer-specific navigation */}
                {user?.role === 'lecturer' && (
                  <NavDropdown title="Lecturer" id="lecturer-dropdown">
                    <NavDropdown.Item as={Link} to="/reports" onClick={handleNavClick} active={isActive('/reports')}>
                      <i className="bi bi-file-text me-2"></i>
                      Reports
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/lecturer/classes" onClick={handleNavClick} active={isActive('/lecturer/classes')}>
                      <i className="bi bi-journal-text me-2"></i>
                      Classes
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/lecturer/monitoring" onClick={handleNavClick} active={isActive('/lecturer/monitoring')}>
                      <i className="bi bi-activity me-2"></i>
                      Monitoring
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/lecturer/rating" onClick={handleNavClick} active={isActive('/lecturer/rating')}>
                      <i className="bi bi-star-half me-2"></i>
                      Rating
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/reports/lecturer/new" onClick={handleNavClick}>
                      <i className="bi bi-journal-plus me-2"></i>
                      New Lecturer Report
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/analytics" onClick={handleNavClick} active={isActive('/analytics')}>
                      <i className="bi bi-graph-up me-2"></i>
                      Analytics
                    </NavDropdown.Item>
                  </NavDropdown>
                )}

                {/* Principal Lecturer (PRL) navigation */}
                {user?.role === 'principal_lecturer' && (
                  <NavDropdown title="PRL" id="prl-dropdown">
                    <NavDropdown.Item as={Link} to="/prl/courses" onClick={handleNavClick} active={isActive('/prl/courses')}>
                      <i className="bi bi-journal-text me-2"></i>
                      Courses
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/reports" onClick={handleNavClick} active={isActive('/reports')}>
                      <i className="bi bi-file-text me-2"></i>
                      Reports
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/prl/monitoring" onClick={handleNavClick} active={isActive('/prl/monitoring')}>
                      <i className="bi bi-activity me-2"></i>
                      Monitoring
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/prl/rating" onClick={handleNavClick} active={isActive('/prl/rating')}>
                      <i className="bi bi-star-half me-2"></i>
                      Rating
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/prl/classes" onClick={handleNavClick} active={isActive('/prl/classes')}>
                      <i className="bi bi-collection me-2"></i>
                      Classes
                    </NavDropdown.Item>
                  </NavDropdown>
                )}
                {/* Program Leader navigation */}
                {user?.role === 'program_leader' && (
                  <NavDropdown title="PL" id="pl-dropdown">
                    <NavDropdown.Item as={Link} to="/pl/courses" onClick={handleNavClick} active={isActive('/pl/courses')}>
                      <i className="bi bi-journal-text me-2"></i>
                      Courses
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/admin/assign-modules" onClick={handleNavClick} active={isActive('/admin/assign-modules')}>
                      <i className="bi bi-diagram-3 me-2"></i>
                      Assign Modules
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/reports" onClick={handleNavClick} active={isActive('/reports')}>
                      <i className="bi bi-file-text me-2"></i>
                      Reports
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/pl/monitoring" onClick={handleNavClick} active={isActive('/pl/monitoring')}>
                      <i className="bi bi-activity me-2"></i>
                      Monitoring
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/pl/classes" onClick={handleNavClick} active={isActive('/pl/classes')}>
                      <i className="bi bi-collection me-2"></i>
                      Classes
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/admin/assign-modules" onClick={handleNavClick} active={isActive('/admin/assign-modules')}>
                      <i className="bi bi-clipboard-check me-2"></i>
                      Assign Classes
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/pl/lectures" onClick={handleNavClick} active={isActive('/pl/lectures')}>
                      <i className="bi bi-people me-2"></i>
                      Lectures
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/pl/rating" onClick={handleNavClick} active={isActive('/pl/rating')}>
                      <i className="bi bi-star-half me-2"></i>
                      Rating
                    </NavDropdown.Item>
                  </NavDropdown>
                )}

                {/* Faculty Manager navigation */}
                {user?.role === 'faculty_manager' && (
                  <NavDropdown title="Manager" id="fm-dropdown">
                    <NavDropdown.Item as={Link} to="/reports" onClick={handleNavClick} active={isActive('/reports')}>
                      <i className="bi bi-file-text me-2"></i>
                      Reports
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/analytics" onClick={handleNavClick} active={isActive('/analytics')}>
                      <i className="bi bi-graph-up me-2"></i>
                      Analytics
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/users" onClick={handleNavClick} active={isActive('/users')}>
                      <i className="bi bi-people me-2"></i>
                      Users
                    </NavDropdown.Item>
                  </NavDropdown>
                )}

                {(user?.role === 'program_leader' || 
                  user?.role === 'principal_lecturer' || 
                  user?.role === 'faculty_manager' ||
                  user?.role === 'admin') && (
                  <NavDropdown title="Admin Tools" id="admintools-dropdown">
                    <NavDropdown.Item as={Link} to="/analytics" onClick={handleNavClick} active={isActive('/analytics')}>
                      <i className="bi bi-graph-up me-2"></i>
                      Analytics
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/users" onClick={handleNavClick} active={isActive('/users')}>
                      <i className="bi bi-people me-2"></i>
                      User Management
                    </NavDropdown.Item>
                    {user?.role === 'admin' && (
                      <NavDropdown.Item as={Link} to="/admin/audit" onClick={handleNavClick} active={isActive('/admin/audit')}>
                        <i className="bi bi-clipboard-data me-2"></i>
                        Audit Logs
                      </NavDropdown.Item>
                    )}
                  </NavDropdown>
                )}
              </>
            )}
          </Nav>

          <Nav className="ms-auto">
            {!isAuthenticated ? (
              <>
                <Nav.Link 
                  as={Link} 
                  to="/login" 
                  onClick={handleNavClick}
                  className={isActive('/login') ? 'active' : ''}
                >
                  Login
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/register" 
                  onClick={handleNavClick}
                  className={isActive('/register') ? 'active' : ''}
                >
                  Register
                </Nav.Link>
              </>
            ) : (
              <NavDropdown 
                title={
                  <span className="d-inline-flex align-items-center">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Avatar"
                        className="rounded-circle me-2"
                        style={{ width: 24, height: 24, objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.svg'; }}
                      />
                    ) : (
                      <i className="bi bi-person-circle me-1"></i>
                    )}
                    {user?.firstName} {user?.lastName}
                    {user?.role && (
                      <span className="badge bg-secondary text-uppercase ms-2" style={{ fontSize: '0.6rem' }}>{String(user.role).replace('_',' ')}</span>
                    )}
                    {unreadCount > 0 && (
                      <Badge bg="danger" className="ms-2">{unreadCount}</Badge>
                    )}
                  </span>
                } 
                id="user-dropdown"
                align="end"
              >
                <NavDropdown.Item as={Link} to="/profile" onClick={handleNavClick}>
                  <i className="bi bi-person me-2"></i>
                  Profile
                </NavDropdown.Item>
                {/* Admin Dashboard entry removed to keep a single dashboard at '/' */}
                <NavDropdown.Item 
                  onClick={() => {
                    navigate('/reports/create');
                    handleNavClick();
                  }}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Create Report
                </NavDropdown.Item>
                {unreadCount > 0 && (
                  <>
                    <NavDropdown.Divider />
                    <NavDropdown.Item disabled>
                      <i className="bi bi-bell me-2"></i>
                      {unreadCount} New Notification{unreadCount > 1 ? 's' : ''}
                    </NavDropdown.Item>
                  </>
                )}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>

        {/* Theme toggle on the far right when collapsed as well */}
        <div className="d-lg-none ms-auto me-2 my-2">
          <button type="button" className="btn btn-sm btn-outline-light" onClick={toggleTheme} aria-label="Toggle theme">
            <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`}></i>
          </button>
        </div>
      </Container>
      {/* Theme toggle in wide view */}
      <div className="d-none d-lg-block me-3">
        <button type="button" className="btn btn-sm btn-outline-light" onClick={toggleTheme} aria-label="Toggle theme">
          <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`}></i>
        </button>
      </div>
    </BootstrapNavbar>
  );
};

export default Navbar;

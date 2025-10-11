import React from 'react';
import { Container, Row, Col, Card, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatsCard from '../components/dashboard/StatsCard';
import RecentReports from '../components/dashboard/RecentReports';
import QuickActions from '../components/dashboard/QuickActions';
import NotificationsList from '../components/dashboard/NotificationsList';
import TrendsMiniChart from '../components/dashboard/TrendsMiniChart';
import './Dashboard.css';

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth();

  // Get public dashboard data (always visible)
  const { data: publicData, isLoading: publicLoading, error: publicError } = useQuery(
    'dashboard-public',
    apiService.dashboard.getPublic,
    {
      refetchInterval: 60000, // Refresh every minute
      select: (res) => res?.data ?? res,
      onError: () => {},
    }
  );

  // Student: fetch top 5 drafts for quick access
  const { data: myDraftsData } = useQuery(
    ['reports-drafts', user?.id],
    async () => {
      const res = await apiService.reports.getAll({ status: 'draft', limit: 5, page: 1 });
      return res?.data ?? res;
    },
    { enabled: isAuthenticated && user?.role === 'student' }
  );

  // Get personal dashboard data (only when authenticated)
  const { data: personalData, isLoading: personalLoading, error: personalError } = useQuery(
    'dashboard-personal',
    apiService.dashboard.getPersonal,
    {
      enabled: isAuthenticated,
      refetchInterval: 30000, // Refresh every 30 seconds
      select: (res) => res?.data ?? res,
      onError: () => {},
    }
  );

  if (publicLoading || (isAuthenticated && personalLoading)) {
    return <LoadingSpinner />;
  }

  const renderPublicDashboard = () => (
    <>
      {publicError && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger">
              {publicError?.response?.data?.error || 'Failed to load public dashboard'}
            </Alert>
          </Col>
        </Row>
      )}
      <Row className="mb-4">
        <Col>
          <Alert variant="info" className="text-center">
            <h4>Welcome to LUCT Faculty Reporting System</h4>
            <p>
              A centralized platform for students, lecturers, and faculty management 
              to submit reports, provide feedback, and monitor academic progress.
            </p>
            {!isAuthenticated && (
              <div className="mt-3">
                <Button as={Link} to="/login" variant="primary" className="me-2">
                  Login
                </Button>
                <Button as={Link} to="/register" variant="outline-primary">
                  Register
                </Button>
              </div>
            )}
          </Alert>
        </Col>
      </Row>

      {/* Public Statistics - Hero Tiles */}
      <Row className="mb-4">
        <Col md={3} className="mb-3 mb-md-0">
          <StatsCard
            title="Total Users"
            value={(publicData?.generalStats?.total_users ?? publicData?.total_users) || 0}
            color="primary"
            variant="hero"
          />
        </Col>
        <Col md={3} className="mb-3 mb-md-0">
          <StatsCard
            title="Students"
            value={(publicData?.generalStats?.total_students ?? publicData?.total_students) || 0}
            color="success"
            variant="hero"
          />
        </Col>
        <Col md={3} className="mb-3 mb-md-0">
          <StatsCard
            title="Lecturers"
            value={(publicData?.generalStats?.total_lecturers ?? publicData?.total_lecturers) || 0}
            color="info"
            variant="hero"
          />
        </Col>
        <Col md={3}>
          <StatsCard
            title="Courses"
            value={(publicData?.generalStats?.total_courses ?? publicData?.total_courses) || 0}
            color="warning"
            variant="hero"
          />
        </Col>
      </Row>

      {/* Trends mini chart */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Overall Activity</h6>
            </Card.Header>
            <Card.Body>
              <TrendsMiniChart
                label="Reports trend"
                series={(publicData?.trends?.reports_weekly ?? publicData?.trends?.reports ?? []).slice(0, 12)}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stream Statistics */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5>Academic Streams</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                {Array.isArray(publicData?.courseStats) && publicData.courseStats.length > 0 ? publicData.courseStats.map((stream, index) => (
                  <Col md={4} key={index} className="mb-3">
                    <Card className="h-100 border-left-accent">
                      <Card.Body>
                        <h6>{stream.stream_name}</h6>
                        <div className="text-muted small">
                          <div>Courses: {stream.course_count}</div>
                          <div>Students: {stream.enrolled_students}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                )) : (
                  <Col>
                    <div className="text-muted">No stream statistics available</div>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Recent Activity</h5>
            </Card.Header>
            <Card.Body>
              {Array.isArray(publicData?.recentActivity) && publicData.recentActivity.length > 0 ? (
                <div className="activity-list">
                  {publicData.recentActivity.map((activity, index) => (
                    <div key={index} className="activity-item d-flex align-items-center mb-2">
                      <div className="me-3" aria-hidden="true">•</div>
                      <div className="flex-grow-1">
                        <div>
                          New report from {activity.user_role}
                          {activity.course_name && ` in ${activity.course_name}`}
                        </div>
                        <small className="text-muted">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No recent activity</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Latest Users & Latest Reports */}
      <Row className="mt-4">
        <Col md={6} className="mb-3 mb-md-0">
          <Card>
            <Card.Header>
              <h6 className="mb-0">Latest Users</h6>
            </Card.Header>
            <Card.Body>
              {Array.isArray(publicData?.latest_users) && publicData.latest_users.length > 0 ? (
                <div className="list-group list-group-flush">
                  {publicData.latest_users.map((u, idx) => (
                    <div key={idx} className="list-group-item d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center">
                          {(u.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold">{u.username}</div>
                          <div className="text-muted small">{u.email}</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        {u.role && <span className="badge bg-secondary text-uppercase">{u.role}</span>}
                        <small className="text-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted">No recent users</div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Latest Reports</h6>
            </Card.Header>
            <Card.Body>
              {Array.isArray(publicData?.latest_reports) && publicData.latest_reports.length > 0 ? (
                <div className="list-group list-group-flush">
                  {publicData.latest_reports.map((r, idx) => (
                    <div key={idx} className="list-group-item d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar-circle bg-primary text-white d-inline-flex align-items-center justify-content-center">
                          {(r.title || 'R').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold d-flex align-items-center gap-2">
                            {r.title || 'Untitled report'}
                            {(r.status || '').toLowerCase() === 'draft' && (
                              <span className="badge bg-secondary">Draft</span>
                            )}
                            {(r.status || '').toLowerCase() === 'reviewed' && (
                              <span className="badge bg-info text-dark">Reviewed</span>
                            )}
                            {(r.status || '').toLowerCase() === 'submitted' && (
                              <span className="badge bg-warning text-dark">Submitted</span>
                            )}
                            {(r.status || '').toLowerCase() === 'approved' && (
                              <span className="badge bg-success">Approved</span>
                            )}
                            {(r.status || '').toLowerCase() === 'rejected' && (
                              <span className="badge bg-danger">Rejected</span>
                            )}
                          </div>
                          <div className="text-muted small">{r.course_name || 'General'}</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        {r.status && (r.status || '').toLowerCase() !== 'draft' && (
                          <span className={`badge bg-${(r.status || '').toLowerCase() === 'approved' ? 'success' : (r.status || '').toLowerCase() === 'rejected' ? 'danger' : (r.status || '').toLowerCase() === 'submitted' ? 'warning' : 'secondary'}`}>{r.status}</span>
                        )}
                        <small className="text-muted">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted">No recent reports</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderPersonalDashboard = () => (
    <>
      {personalError && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger">
              {personalError?.response?.data?.error || 'Failed to load personal dashboard'}
            </Alert>
          </Col>
        </Row>
      )}
      {/* Welcome Message */}
      <Row className="mb-4">
        <Col>
          <Alert variant="success" className="d-flex align-items-center">
            <div>
              <h5 className="mb-0">
                Welcome back, {user?.firstName} {user?.lastName}!
              </h5>
              <small>Role: {user?.role?.replace('_', ' ').toUpperCase()}</small>
            </div>
          </Alert>
        </Col>
      </Row>

      {/* Personal Statistics - Hero Tiles */}
      <Row className="mb-4">
        {user?.role === 'student' ? (
          <>
            <Col md={3}>
              <StatsCard
                title="My Reports"
                value={personalData?.personalStats?.my_reports || 0}
                
                color="primary"
                variant="hero"
              />
            </Col>
            <Col md={3}>
              <StatsCard
                title="Pending Reports"
                value={personalData?.personalStats?.pending_reports || 0}
                
                color="warning"
                variant="hero"
              />
            </Col>
            <Col md={3}>
              <StatsCard
                title="Enrolled Courses"
                value={personalData?.personalStats?.enrolled_courses || 0}
                
                color="info"
                variant="hero"
              />
            </Col>
            <Col md={3}>
              <StatsCard
                title="Avg Rating Given"
                value={personalData?.personalStats?.avg_class_rating ? 
                  parseFloat(personalData.personalStats.avg_class_rating).toFixed(1) : 'N/A'}
                
                color="success"
                variant="hero"
              />
            </Col>
          </>
        ) : (
          <>
            <Col md={3}>
              <StatsCard
                title="My Courses"
                value={personalData?.personalStats?.my_courses || 0}
                
                color="primary"
                variant="hero"
              />
            </Col>
            <Col md={3}>
              <StatsCard
                title="My Reports"
                value={personalData?.personalStats?.my_reports || 0}
                
                color="info"
                variant="hero"
              />
            </Col>
            <Col md={3}>
              <StatsCard
                title="Total Students"
                value={personalData?.personalStats?.total_students || 0}
                
                color="success"
                variant="hero"
              />
            </Col>
            <Col md={3}>
              <StatsCard
                title="Avg Rating Received"
                value={personalData?.personalStats?.avg_received_rating ? 
                  parseFloat(personalData.personalStats.avg_received_rating).toFixed(1) : 'N/A'}
                
                color="warning"
                variant="hero"
              />
            </Col>
          </>
        )}
      </Row>

      {user?.role !== 'student' && (
        <Row className="mb-4">
          <Col md={4}>
            <StatsCard
              title="Peer Avg (Colleagues)"
              value={personalData?.personalStats?.peer_avg_received != null ? String(personalData.personalStats.peer_avg_received) : 'N/A'}
              color="secondary"
              variant="default"
            />
          </Col>
          <Col md={4}>
            <StatsCard
              title="Peer Ratings Count"
              value={personalData?.personalStats?.peer_ratings_count || 0}
              color="secondary"
              variant="default"
            />
          </Col>
        </Row>
      )}

      {/* Trends mini chart for personal activity */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">My Activity (Recent)</h6>
            </Card.Header>
            <Card.Body>
              <TrendsMiniChart
                label="My reports trend"
                series={(personalData?.trends?.my_reports_recent ?? personalData?.trends?.reports ?? []).slice(0, 12)}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content Row */}
      <Row>
        {/* Left Column - Recent Reports & Quick Actions */}
        <Col lg={8}>
          <RecentReports reports={personalData?.recentReports || []} />
          <QuickActions userRole={user?.role} />

          {user?.role === 'student' && Array.isArray(personalData?.courseActivity) && personalData.courseActivity.length > 0 && (
            <Card className="mt-3">
              <Card.Header>
                <h6 className="mb-0">Recent Course Activity</h6>
              </Card.Header>
              <Card.Body>
                <div className="list-group list-group-flush">
                  {personalData.courseActivity.map((it) => (
                    <div key={it.id} className="list-group-item d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold">{it.title || 'Report'}</div>
                        <small className="text-muted">
                          {it.course_name || 'Course'} • {it.reporter_role || ''} • {new Date(it.created_at).toLocaleDateString()}
                        </small>
                      </div>
                      <Link to={`/reports/${it.id}`} className="btn btn-sm btn-outline-secondary">Open</Link>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Right Column - Notifications & Pending Actions */}
        <Col lg={4}>
          <NotificationsList />
          {user?.role === 'student' && (
            <Card className="mt-3">
              <Card.Header>
                <h6 className="mb-0">My Drafts</h6>
              </Card.Header>
              <Card.Body>
                {Array.isArray(myDraftsData?.reports) && myDraftsData.reports.length > 0 ? (
                  <div className="list-group list-group-flush">
                    {myDraftsData.reports.map((d) => (
                      <div key={d.id} className="list-group-item d-flex align-items-center justify-content-between">
                        <div className="me-2">
                          <div className="fw-semibold">{d.title || 'Untitled draft'}</div>
                          <small className="text-muted">{new Date(d.created_at).toLocaleDateString()}</small>
                        </div>
                        <Link to={`/reports/${d.id}`} className="btn btn-sm btn-outline-secondary">Open</Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted">No drafts</div>
                )}
                <div className="mt-2 text-end">
                  <Link to="/reports?status=draft" className="btn btn-sm btn-outline-primary">View all drafts</Link>
                </div>
              </Card.Body>
            </Card>
          )}
          
          {personalData?.pendingActions?.length > 0 && (
            <Card className="mt-3">
              <Card.Header>
                <h6>Pending Actions</h6>
              </Card.Header>
              <Card.Body>
                {personalData.pendingActions.map((action, index) => (
                  <div key={index} className="d-flex align-items-center mb-2 p-2 bg-light rounded">
                    <div className="flex-grow-1">
                      <div className="fw-bold">{action.title}</div>
                      <small className="text-muted">
                        From: {action.first_name} {action.last_name}
                        {action.course_name && ` • ${action.course_name}`}
                      </small>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      as={Link}
                      to={`/reports/${action.id}`}
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}

          {/* My Courses */}
          {personalData?.courses?.length > 0 && (
            <Card className="mt-3">
              <Card.Header>
                <h6>My Courses</h6>
              </Card.Header>
              <Card.Body>
                {personalData.courses.map((course, index) => (
                  <div key={index} className="course-item mb-2 p-2 border rounded">
                    <div className="fw-bold">{course.course_name}</div>
                    <div className="text-muted small">
                      {course.course_code} • {course.stream_name}
                      {course.student_count && ` • ${course.student_count} students`}
                      {course.avg_rating && ` • ${parseFloat(course.avg_rating).toFixed(1)} ⭐`}
                    </div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}

          {/* Suggested Courses for students without enrollments */}
          {user?.role === 'student' && Array.isArray(personalData?.suggestedCourses) && personalData.suggestedCourses.length > 0 && (
            <Card className="mt-3">
              <Card.Header>
                <h6>Suggested Courses</h6>
              </Card.Header>
              <Card.Body>
                {personalData.suggestedCourses.map((c, idx) => (
                  <div key={idx} className="d-flex align-items-center justify-content-between mb-2 p-2 border rounded">
                    <div>
                      <div className="fw-semibold">{c.course_name}</div>
                      <small className="text-muted">{c.course_code} • {c.stream_name} • {c.enrolled_students || 0} students</small>
                    </div>
                    <Button as={Link} to="/courses" size="sm" variant="outline-primary">View</Button>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </>
  );

  return (
    <Container fluid className="dashboard-container">
      <div className="dashboard-header mb-4">
        <h2>
          {isAuthenticated ? 'Personal Dashboard' : 'Faculty Reporting Dashboard'}
        </h2>
        <p className="text-muted">
          {isAuthenticated 
            ? `Welcome back! Here's your personalized overview.`
            : 'Monitor academic reporting and faculty activities.'
          }
        </p>
      </div>

      {isAuthenticated ? renderPersonalDashboard() : renderPublicDashboard()}
    </Container>
  );
};

export default Dashboard;

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Table, Pagination, InputGroup, Dropdown, ButtonGroup } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiService, downloadFile } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import './Reports.css';

const Reports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states
  const [filters, setFilters] = useState(() => {
    const getNum = (key, def) => {
      const v = parseInt(searchParams.get(key));
      return Number.isFinite(v) && v > 0 ? v : def;
    };

  const handleSubmitDraft = async (reportId) => {
    const targetRole = user?.role === 'student' ? 'LECTURER' : 'PROGRAM_LEADER';
    const confirmed = window.confirm(`Submit this draft for review to ${targetRole}?`);
    if (!confirmed) return;
    try {
      await apiService.reports.submit(reportId);
      toast.success(`Report submitted to ${targetRole}`);
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to submit report';
      toast.error(msg);
    }
  };
    return {
      page: getNum('page', 1),
      limit: getNum('limit', 10),
      status: searchParams.get('status') || '',
      reportType: searchParams.get('reportType') || '',
      search: searchParams.get('search') || '',
      courseId: searchParams.get('courseId') || '',
      streamId: searchParams.get('streamId') || searchParams.get('stream_id') || ''
    };
  });

  // Keep URL in sync with filters
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.page && filters.page !== 1) params.set('page', String(filters.page));
    if (filters.limit && filters.limit !== 10) params.set('limit', String(filters.limit));
    if (filters.status) params.set('status', filters.status);
    if (filters.reportType) params.set('reportType', filters.reportType);
    if (filters.search) params.set('search', filters.search);
    if (filters.courseId) params.set('courseId', String(filters.courseId));
    if (filters.streamId) params.set('streamId', String(filters.streamId));
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [streams, setStreams] = useState([]);
  const [streamsLoading, setStreamsLoading] = useState(false);

  // Load streams for filter
  useEffect(() => {
    const loadStreams = async () => {
      try {
        setStreamsLoading(true);
        const { data } = await apiService.users.getStreams();
        const list = Array.isArray(data?.streams) ? data.streams : [];
        setStreams(list);
      } catch (e) {
        // ignore
      } finally {
        setStreamsLoading(false);
      }
    };
    loadStreams();
  }, []);

  // Load role-aware available courses for filter, optionally by stream
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setCoursesLoading(true);
        const params = filters.streamId ? { stream_id: filters.streamId } : undefined;
        const { data } = await apiService.users.getAvailableCourses(params);
        const list = Array.isArray(data?.courses) ? data.courses : Array.isArray(data) ? data : [];
        setCourses(list);
      } catch (e) {
        // ignore, non-fatal
      } finally {
        setCoursesLoading(false);
      }
    };
    loadCourses();
  }, [filters.streamId]);

  // Get reports with filters
  const { data: reportsData, isLoading, refetch } = useQuery(
    ['reports', filters],
    () => apiService.reports.getAll(filters),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      select: (res) => res?.data ?? res,
    }
  );

  const isElevated = ['admin','faculty_manager','principal_lecturer','program_leader'].includes(user?.role);

  const handleModerate = async (reportId, data) => {
    try {
      await apiService.reports.moderate(reportId, data);
      toast.success('Report updated');
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to update report';
      toast.error(msg);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const handleExportExcel = async () => {
    try {
      const params = { ...filters };
      if (params.streamId) {
        params.stream_id = params.streamId;
        delete params.streamId;
      }
      const response = await apiService.export.reportsExcel(params);
      const filename = `reports_${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadFile(response.data, filename);
      toast.success('Reports exported to Excel successfully!');
    } catch (error) {
      toast.error('Failed to export reports');
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = { ...filters };
      if (params.streamId) {
        params.stream_id = params.streamId;
        delete params.streamId;
      }
      const response = await apiService.export.reportsPdf(params);
      const filename = `reports_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadFile(response.data, filename);
      toast.success('Reports exported to PDF successfully!');
    } catch (error) {
      toast.error('Failed to export reports');
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'submitted': return 'primary';
      case 'reviewed': return 'info';
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'draft': return 'secondary';
      default: return 'secondary';
    }
  };

  const getReportTypeDisplay = (type) => {
    return type.replace('_', ' ').split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderPagination = () => {
    if (!reportsData?.pagination) return null;

    const { page, pages } = reportsData.pagination;
    const items = [];

    // Previous button
    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
      />
    );

    // Page numbers
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === page}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    // Next button
    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(page + 1)}
        disabled={page === pages}
      />
    );

    return <Pagination className="justify-content-center">{items}</Pagination>;
  };

  if (isLoading && !reportsData) {
    return <LoadingSpinner />;
  }

  const reports = reportsData?.reports || [];
  const pagination = reportsData?.pagination || {};

  return (
    <Container fluid className="reports-container">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <i className="bi bi-file-text me-2"></i>
                Reports Management
              </h2>
              <p className="text-muted mb-0">
                {pagination.total || 0} total reports
              </p>
              <div className="mt-2 small d-flex gap-2 flex-wrap align-items-center">
                <span className="text-muted me-1">Legend:</span>
                <span className="badge bg-secondary">Draft</span>
                <span className="badge bg-warning text-dark">Submitted</span>
                <span className="badge bg-info text-dark">Reviewed</span>
                <span className="badge bg-success">Approved</span>
                <span className="badge bg-danger">Rejected</span>
              </div>
              {(filters.courseId || filters.streamId) && (
                <div className="mt-2 d-flex gap-2 flex-wrap">
                  {filters.streamId && (
                    <Badge bg="secondary">
                      Stream: {streams.find(s => String(s.id) === String(filters.streamId))?.stream_name || filters.streamId}
                    </Badge>
                  )}
                  {filters.courseId && (
                    <Badge bg="info">
                      Course: {courses.find(c => String(c.id) === String(filters.courseId))?.course_name || filters.courseId}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div>
              {user?.role === 'lecturer' && (
                filters.reportType === 'lecturer_report' ? (
                  <Button
                    variant="outline-secondary"
                    className="me-2"
                    onClick={() => handleFilterChange('reportType', '')}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Clear My Lecturer Reports
                  </Button>
                ) : (
                  <Button
                    variant="outline-info"
                    className="me-2"
                    onClick={() => handleFilterChange('reportType', 'lecturer_report')}
                  >
                    <i className="bi bi-funnel me-2"></i>
                    My Lecturer Reports
                  </Button>
                )
              )}
              {user?.role !== 'lecturer' && (
                <Button
                  variant="primary"
                  as={Link}
                  to="/reports/create"
                  className="me-2"
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Create Report
                </Button>
              )}
              {user?.role === 'lecturer' && (
                <Button
                  variant="outline-primary"
                  as={Link}
                  to="/reports/lecturer/new"
                  className="me-2"
                >
                  <i className="bi bi-journal-plus me-2"></i>
                  New Lecturer Report
                </Button>
              )}
              
              <Dropdown as={ButtonGroup}>
                <Button variant="outline-success">
                  <i className="bi bi-download me-2"></i>
                  Export
                </Button>
                <Dropdown.Toggle split variant="outline-success" />
                <Dropdown.Menu align="end">
                  <Dropdown.Item onClick={handleExportExcel}>
                    <i className="bi bi-file-excel me-2"></i>
                    Export to Excel
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handleExportPDF}>
                    <i className="bi bi-file-pdf me-2"></i>
                    Export to PDF
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search reports..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </InputGroup>
            </Col>
            
            <Col md={3}>
              <Form.Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="draft">Draft</option>
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Select
                value={filters.reportType}
                onChange={(e) => handleFilterChange('reportType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="student_report">Student Report</option>
                <option value="lecturer_report">Lecturer Report</option>
                <option value="progress_report">Progress Report</option>
                <option value="feedback_report">Feedback Report</option>
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Select
                value={filters.courseId}
                onChange={(e) => handleFilterChange('courseId', e.target.value)}
                disabled={coursesLoading}
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_name || c.name} {c.course_code ? `(${c.course_code})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </Form.Select>
            </Col>
          </Row>
          <Row className="align-items-center mt-3">
            <Col md={6} className="mb-2 mb-md-0">
              <Form.Select
                value={filters.streamId}
                onChange={(e) => handleFilterChange('streamId', e.target.value)}
                disabled={streamsLoading}
              >
                <option value="">All Streams</option>
                {streams.map((s) => (
                  <option key={s.id} value={s.id}>{s.stream_name} {s.stream_code ? `(${s.stream_code})` : ''}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Select
                value={filters.courseId}
                onChange={(e) => handleFilterChange('courseId', e.target.value)}
                disabled={coursesLoading}
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_name || c.name} {c.course_code ? `(${c.course_code})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
          <div className="mt-3 d-flex justify-content-end">
            <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ page: 1, limit: 10, status: '', reportType: '', search: '', courseId: '', streamId: '' })}>
              Reset Filters
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Reports Table */}
      <Card>
        <Card.Body className="p-0">
          {reports.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-file-text display-1 text-muted"></i>
              <h4 className="mt-3">No Reports Found</h4>
              <p className="text-muted">
                {filters.search || filters.status || filters.reportType
                  ? 'Try adjusting your filters'
                  : 'Create your first report to get started'
                }
              </p>
              {!filters.search && !filters.status && !filters.reportType && (
                <div className="d-flex justify-content-center gap-2">
                  {user?.role !== 'lecturer' && (
                    <Button variant="primary" as={Link} to="/reports/create">
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Report
                    </Button>
                  )}
                  {user?.role === 'lecturer' && (
                    <Button variant="primary" as={Link} to="/reports/lecturer/new">
                      <i className="bi bi-journal-plus me-2"></i>
                      New Lecturer Report
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <Table responsive hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Reporter</th>
                    <th>Course</th>
                    <th>Rating</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <div className="fw-bold d-flex align-items-center gap-2">
                          {report.title}
                          {(report.status || '').toLowerCase() === 'draft' && (
                            <span className="badge bg-secondary">Draft</span>
                          )}
                          {(report.status || '').toLowerCase() === 'submitted' && (
                            <span className="badge bg-warning text-dark">Submitted</span>
                          )}
                          {(report.status || '').toLowerCase() === 'reviewed' && (
                            <span className="badge bg-info text-dark">Reviewed</span>
                          )}
                          {(report.status || '').toLowerCase() === 'approved' && (
                            <span className="badge bg-success">Approved</span>
                          )}
                          {(report.status || '').toLowerCase() === 'rejected' && (
                            <span className="badge bg-danger">Rejected</span>
                          )}
                        </div>
                        <small className="text-muted">
                          {report.content.substring(0, 80)}
                          {report.content.length > 80 ? '...' : ''}
                        </small>
                      </td>
                      <td>
                        <Badge bg="info">
                          {getReportTypeDisplay(report.report_type)}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getStatusVariant(report.status)}>
                          {report.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <div>{report.first_name} {report.last_name}</div>
                        <small className="text-muted">
                          {getReportTypeDisplay(report.reporter_role)}
                        </small>
                      </td>
                      <td>
                        {report.course_name ? (
                          <div>
                            <div className="fw-bold">{report.course_name}</div>
                            <small className="text-muted">{report.course_code}</small>
                          </div>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        {report.rating ? (
                          <div className="d-flex align-items-center" title={`${report.rating} / 5`}>
                            {[1,2,3,4,5].map(i => (
                              <i
                                key={i}
                                className={`bi ${i <= report.rating ? 'bi-star-fill text-warning' : 'bi-star text-warning'}`}
                                style={{ fontSize: 14, marginRight: 2 }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        <div>{new Date(report.created_at).toLocaleDateString()}</div>
                        <small className="text-muted">
                          {new Date(report.created_at).toLocaleTimeString()}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            as={Link}
                            to={`/reports/${report.id}`}
                            title="View Details"
                          >
                            <i className="bi bi-eye"></i>
                          </Button>

                          {report.reporter_id === user?.id && report.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => navigate(`/reports/${report.id}/edit`)}
                              title="Edit Report"
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                          )}

                          {report.reporter_id === user?.id && report.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => handleSubmitDraft(report.id)}
                              title="Submit Draft"
                            >
                              <i className="bi bi-send"></i>
                            </Button>
                          )}

                          {isElevated && (
                            <Dropdown as={ButtonGroup} size="sm">
                              <Button variant="outline-success" onClick={() => handleModerate(report.id, { status: 'approved' })} title="Approve">
                                <i className="bi bi-check2-circle"></i>
                              </Button>
                              <Dropdown.Toggle split variant="outline-success" />
                              <Dropdown.Menu align="end">
                                <Dropdown.Item onClick={() => handleModerate(report.id, { status: 'reviewed' })}>
                                  <i className="bi bi-eye me-2"></i>Mark Reviewed
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleModerate(report.id, { status: 'rejected' })}>
                                  <i className="bi bi-x-circle me-2"></i>Reject
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => {
                                  const val = window.prompt('Enter rating 1-5');
                                  const n = Number(val);
                                  if (Number.isInteger(n) && n >= 1 && n <= 5) {
                                    handleModerate(report.id, { rating: n });
                                  } else if (val !== null) {
                                    toast.error('Invalid rating');
                                  }
                                }}>
                                  <i className="bi bi-star-half me-2"></i>Set Rating
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="p-3 border-top">
                  <Row className="align-items-center">
                    <Col md={6}>
                      <small className="text-muted">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} results
                      </small>
                    </Col>
                    <Col md={6}>
                      {renderPagination()}
                    </Col>
                  </Row>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Reports;

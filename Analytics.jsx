import React from 'react';
import { useQuery } from 'react-query';
import { apiService, downloadFile } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Alert, Card, Col, Row } from 'react-bootstrap';
import toast from 'react-hot-toast';
import './Analytics.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export default function Analytics() {
  const [selectedDays, setSelectedDays] = React.useState(30);
  const { data, isLoading, error, refetch } = useQuery(['dashboard-analytics', selectedDays], () => apiService.dashboard.getAnalytics(selectedDays), {
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Failed to load analytics');
    },
  });

  // Resolve theme-aware colors
  const getCssVar = (name, fallback) => {
    try {
      const root = getComputedStyle(document.documentElement);
      const val = (root.getPropertyValue(name) || '').trim();
      return val || fallback;
    } catch (_) {
      return fallback;
    }
  };
  const brand = getCssVar('--brand', 'rgba(13,110,253,1)');
  const brandFill = brand.startsWith('#') ? `${brand}33` : 'rgba(13,110,253,0.2)';
  const textColor = getCssVar('--text', '#111827');
  const mutedColor = getCssVar('--muted', '#6b7280');

  const handleDaysChange = (days) => {
    setSelectedDays(days);
  };

  const exportAnalyticsExcel = async () => {
    try {
      const { data: blob } = await apiService.export.analyticsExcel({ days: selectedDays, responseType: 'blob' });
      downloadFile(blob, `analytics_${selectedDays}d.xlsx`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to export analytics');
    }
  };

  const exportReportsPdf = async () => {
    try {
      const params = { startDate: new Date(Date.now() - selectedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
      const { data: blob } = await apiService.export.reportsPdf(params);
      downloadFile(blob, `reports_${selectedDays}d.pdf`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to export reports PDF');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="container py-4">
      <h1 className="mb-4">Analytics</h1>

      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div className="btn-group" role="group" aria-label="Time range">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className={`btn btn-sm ${selectedDays === d ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleDaysChange(d)}
            >
              Last {d} days
            </button>
          ))}
        </div>
        <div className="d-flex gap-2 mt-2 mt-sm-0">
          <button className="btn btn-outline-success btn-sm" onClick={exportAnalyticsExcel}>
            <i className="bi bi-file-earmark-excel me-1" /> Export Analytics (Excel)
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={exportReportsPdf}>
            <i className="bi bi-filetype-pdf me-1" /> Export Reports (PDF)
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="danger">{error?.response?.data?.error || 'Failed to load analytics'}</Alert>
      )}

      <Row className="g-3">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="m-0"><i className="bi bi-graph-up me-2" />Report Trends (30 days)</h6>
            </Card.Header>
            <Card.Body>
              {Array.isArray(data?.reportTrends) && data.reportTrends.length > 0 ? (
                <>
                <Line
                  data={{
                    labels: data.reportTrends.map(t => new Date(t.report_date).toLocaleDateString()),
                    datasets: [
                      {
                        label: 'Reports',
                        data: data.reportTrends.map(t => t.report_count),
                        borderColor: brand,
                        backgroundColor: brandFill,
                        tension: 0.3,
                      },
                      {
                        label: 'Approved',
                        data: data.reportTrends.map(t => t.approved_count),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.3,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'top', labels: { color: textColor } } },
                    scales: { 
                      x: { ticks: { color: mutedColor }, grid: { display: false } },
                      y: { beginAtZero: true, ticks: { color: mutedColor }, grid: { color: 'rgba(100,116,139,0.2)' } },
                    },
                  }}
                />
                <div className="text-muted small mt-2">
                  Legend: <span className="text-primary">Reports</span> vs <span className="text-success">Approved</span> across selected time range.
                </div>
                </>
              ) : (
                <div className="text-muted">No trend data</div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="m-0"><i className="bi bi-star-half me-2" />Rating Distribution</h6>
            </Card.Header>
            <Card.Body>
              {Array.isArray(data?.ratingDistribution) && data.ratingDistribution.length > 0 ? (
                <>
                <Bar
                  data={{
                    labels: data.ratingDistribution.map(r => `Rating ${r.rating}`),
                    datasets: [
                      {
                        label: 'Count',
                        data: data.ratingDistribution.map(r => r.count),
                        backgroundColor: 'rgba(255, 206, 86, 0.6)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{ 
                    responsive: true, 
                    plugins: { legend: { labels: { color: textColor } } },
                    scales: { 
                      x: { ticks: { color: mutedColor }, grid: { display: false } },
                      y: { beginAtZero: true, ticks: { color: mutedColor }, grid: { color: 'rgba(100,116,139,0.2)' } },
                    } 
                  }}
                />
                <div className="text-muted small mt-2">
                  Legend: Bars show how many reports received each rating.
                </div>
                </>
              ) : (
                <div className="text-muted">No rating data</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="m-0"><i className="bi bi-diagram-3 me-2" />Stream Performance</h6>
            </Card.Header>
            <Card.Body>
              {Array.isArray(data?.streamPerformance) && data.streamPerformance.length > 0 ? (
                <>
                <Bar
                  data={{
                    labels: data.streamPerformance.map(s => s.stream_name),
                    datasets: [
                      {
                        label: 'Total Reports',
                        data: data.streamPerformance.map(s => s.total_reports),
                        backgroundColor: brandFill,
                        borderColor: brand,
                        borderWidth: 1,
                      },
                      {
                        label: 'Approved Reports',
                        data: data.streamPerformance.map(s => s.approved_reports),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{ 
                    responsive: true, 
                    plugins: { legend: { labels: { color: textColor } } },
                    scales: { 
                      x: { ticks: { color: mutedColor }, grid: { display: false } },
                      y: { beginAtZero: true, ticks: { color: mutedColor }, grid: { color: 'rgba(100,116,139,0.2)' } },
                    } 
                  }}
                />
                <div className="text-muted small mt-2">
                  Legend: Blue = Total Reports, Teal = Approved Reports per stream.
                </div>
                </>
              ) : (
                <div className="text-muted">No stream performance data</div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="m-0"><i className="bi bi-book me-2" />Course Popularity</h6>
            </Card.Header>
            <Card.Body>
              {Array.isArray(data?.coursePopularity) && data.coursePopularity.length > 0 ? (
                <>
                <Bar
                  data={{
                    labels: data.coursePopularity.map(c => c.course_name),
                    datasets: [
                      {
                        label: 'Enrolled Students',
                        data: data.coursePopularity.map(c => c.enrolled_students),
                        backgroundColor: 'rgba(153, 102, 255, 0.6)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1,
                      },
                      {
                        label: 'Avg Rating',
                        data: data.coursePopularity.map(c => Number(c.avg_rating || 0)),
                        backgroundColor: 'rgba(255, 159, 64, 0.6)',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{ 
                    responsive: true, 
                    plugins: { legend: { labels: { color: textColor } } },
                    scales: { 
                      x: { ticks: { color: mutedColor }, grid: { display: false } },
                      y: { beginAtZero: true, ticks: { color: mutedColor }, grid: { color: 'rgba(100,116,139,0.2)' } },
                    } 
                  }}
                />
                <div className="text-muted small mt-2">
                  Legend: Purple = Enrolled Students, Orange = Average Rating per course.
                </div>
                </>
              ) : (
                <div className="text-muted">No course data</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

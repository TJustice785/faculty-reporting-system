import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Toaster } from 'react-hot-toast';
import './App.css';
import Favicon from './components/common/Favicon.jsx';

// Context is applied at top-level in main.jsx

// Components
import Navbar from './components/layout/Navbar.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Reports from './pages/reports/Reports.jsx';
import CreateReport from './pages/reports/CreateReport';
import ReportDetail from './pages/reports/ReportDetail';
import LecturerReportForm from './pages/reports/LecturerReportForm.jsx';
import Profile from './pages/Profile.jsx';
import Users from './pages/admin/Users.jsx';
import Analytics from './pages/Analytics.jsx';
import NotFound from './pages/NotFound.jsx';
import MyProgress from './pages/MyProgress.jsx';
import Notifications from './pages/Notifications.jsx';
import PendingActions from './pages/PendingActions.jsx';
import StudentMonitoring from './pages/monitoring/StudentMonitoring.jsx';
import StudentRating from './pages/rating/StudentRating.jsx';
import StudentClasses from './pages/classes/StudentClasses.jsx';
import AssignModules from './pages/admin/AssignModules.jsx';
import LecturerClasses from './pages/classes/LecturerClasses.jsx';
import LecturerMonitoring from './pages/monitoring/LecturerMonitoring.jsx';
import LecturerRating from './pages/rating/LecturerRating.jsx';
import PRLCourses from './pages/prl/PRLCourses.jsx';
import PRLMonitoring from './pages/prl/PRLMonitoring.jsx';
import PRLRating from './pages/prl/PRLRating.jsx';
import PRLClasses from './pages/prl/PRLClasses.jsx';
import PLCourses from './pages/pl/PLCourses.jsx';
import PLMonitoring from './pages/pl/PLMonitoring.jsx';
import PLClasses from './pages/pl/PLClasses.jsx';
import PLLectures from './pages/pl/PLLectures.jsx';
import PLRating from './pages/pl/PLRating.jsx';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App">
            <Favicon />
            <Navbar />
            <main className="main-content">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Routes */}
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                } />
                
                <Route path="/reports/create" element={
                  <ProtectedRoute roles={['student','admin','program_leader','principal_lecturer','faculty_manager']}>
                    <CreateReport />
                  </ProtectedRoute>
                } />

                {/* Lecturer Reporting Form */}
                <Route path="/reports/lecturer/new" element={
                  <ProtectedRoute roles={['lecturer', 'admin', 'program_leader', 'principal_lecturer', 'faculty_manager']}>
                    <LecturerReportForm />
                  </ProtectedRoute>
                } />
                
                <Route path="/reports/:id" element={
                  <ProtectedRoute>
                    <ReportDetail />
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                
                <Route path="/analytics" element={
                  <ProtectedRoute roles={['admin', 'program_leader', 'principal_lecturer', 'faculty_manager']}>
                    <Analytics />
                  </ProtectedRoute>
                } />
                
                <Route path="/users" element={
                  <ProtectedRoute roles={['admin', 'program_leader', 'principal_lecturer', 'faculty_manager']}>
                    <Users />
                  </ProtectedRoute>
                } />

                <Route path="/admin/assign-modules" element={
                  <ProtectedRoute roles={['admin', 'program_leader', 'principal_lecturer', 'faculty_manager']}>
                    <AssignModules />
                  </ProtectedRoute>
                } />

                <Route path="/my-progress" element={
                  <ProtectedRoute roles={['student']}>
                    <MyProgress />
                  </ProtectedRoute>
                } />

                <Route path="/my-classes" element={
                  <ProtectedRoute roles={['student']}>
                    <StudentClasses />
                  </ProtectedRoute>
                } />

                <Route path="/monitoring" element={
                  <ProtectedRoute roles={['student']}>
                    <StudentMonitoring />
                  </ProtectedRoute>
                } />

                <Route path="/rating" element={
                  <ProtectedRoute roles={['student']}>
                    <StudentRating />
                  </ProtectedRoute>
                } />

                {/* Notifications & Pending */}
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                } />
                <Route path="/pending" element={
                  <ProtectedRoute>
                    <PendingActions />
                  </ProtectedRoute>
                } />

                {/* Lecturer Modules */}
                <Route path="/lecturer/classes" element={
                  <ProtectedRoute roles={['lecturer','admin','program_leader','principal_lecturer','faculty_manager']}>
                    <LecturerClasses />
                  </ProtectedRoute>
                } />
                <Route path="/lecturer/monitoring" element={
                  <ProtectedRoute roles={['lecturer','admin','program_leader','principal_lecturer','faculty_manager']}>
                    <LecturerMonitoring />
                  </ProtectedRoute>
                } />
                <Route path="/lecturer/rating" element={
                  <ProtectedRoute roles={['lecturer','admin','program_leader','principal_lecturer','faculty_manager']}>
                    <LecturerRating />
                  </ProtectedRoute>
                } />

                {/* Principal Lecturer (PRL) Modules */}
                <Route path="/prl/courses" element={
                  <ProtectedRoute roles={['principal_lecturer']}>
                    <PRLCourses />
                  </ProtectedRoute>
                } />
                <Route path="/prl/monitoring" element={
                  <ProtectedRoute roles={['principal_lecturer']}>
                    <PRLMonitoring />
                  </ProtectedRoute>
                } />
                <Route path="/prl/rating" element={
                  <ProtectedRoute roles={['principal_lecturer']}>
                    <PRLRating />
                  </ProtectedRoute>
                } />
                <Route path="/prl/classes" element={
                  <ProtectedRoute roles={['principal_lecturer']}>
                    <PRLClasses />
                  </ProtectedRoute>
                } />

                {/* Program Leader (PL) Modules */}
                <Route path="/pl/courses" element={
                  <ProtectedRoute roles={['program_leader']}>
                    <PLCourses />
                  </ProtectedRoute>
                } />
                <Route path="/pl/monitoring" element={
                  <ProtectedRoute roles={['program_leader']}>
                    <PLMonitoring />
                  </ProtectedRoute>
                } />
                <Route path="/pl/classes" element={
                  <ProtectedRoute roles={['program_leader']}>
                    <PLClasses />
                  </ProtectedRoute>
                } />
                <Route path="/pl/lectures" element={
                  <ProtectedRoute roles={['program_leader']}>
                    <PLLectures />
                  </ProtectedRoute>
                } />
                <Route path="/pl/rating" element={
                  <ProtectedRoute roles={['program_leader']}>
                    <PLRating />
                  </ProtectedRoute>
                } />
                
                {/* 404 Page */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              reverseOrder={false}
              gutter={8}
              containerClassName=""
              containerStyle={{}}
              toastOptions={{
                // Define default options
                className: '',
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                // Default options for specific types
                success: {
                  duration: 3000,
                  theme: {
                    primary: 'green',
                    secondary: 'black',
                  },
                },
              }}
            />
          </div>
        </Router>
        
        {/* React Query Devtools */}
        {import.meta.env.MODE === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;

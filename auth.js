const jwt = require('jsonwebtoken');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user details from database
    const [users] = await req.db.execute(
      'SELECT id, username, email, role, first_name, last_name FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Token verification failed.' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Check if user owns resource or has higher role
const authorizeOwnerOrHigher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Role hierarchy
    const roleHierarchy = {
      'student': 1,
      'lecturer': 2,
      'program_leader': 3,
      'principal_lecturer': 4,
      'faculty_manager': 5
    };

    // If accessing own resource
    if (parseInt(id) === currentUser.id) {
      return next();
    }

    // Check if current user has higher role than target user
    const [targetUsers] = await req.db.execute(
      'SELECT role FROM users WHERE id = ?',
      [id]
    );

    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentUserLevel = roleHierarchy[currentUser.role] || 0;
    const targetUserLevel = roleHierarchy[targetUsers[0].role] || 0;

    if (currentUserLevel > targetUserLevel) {
      return next();
    }

    res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed.' });
  }
};

// Validate report access based on hierarchy
const validateReportAccess = async (req, res, next) => {
  try {
    // Accept either ":reportId" or ":id" param names used by routes
    const reportId = req.params.reportId || req.params.id;
    const currentUser = req.user;

    // Get report details
    const [reports] = await req.db.execute(`
      SELECT r.*, u.role as reporter_role 
      FROM reports r 
      JOIN users u ON r.reporter_id = u.id 
      WHERE r.id = ?
    `, [reportId]);

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const report = reports[0];

    // Report owner can always access
    if (report.reporter_id === currentUser.id) {
      req.report = report;
      return next();
    }

    // Role-based access logic
    const roleHierarchy = {
      'student': 1,
      'lecturer': 2,
      'program_leader': 3,
      'principal_lecturer': 4,
      'faculty_manager': 5
    };

    const currentUserLevel = roleHierarchy[currentUser.role] || 0;
    const reporterLevel = roleHierarchy[report.reporter_role] || 0;

    // Users can access reports from users below them in hierarchy
    if (currentUserLevel > reporterLevel) {
      req.report = report;
      return next();
    }

    // Special case: lecturers can see student reports in their courses
    if (currentUser.role === 'lecturer' && report.reporter_role === 'student') {
      const [courseCheck] = await req.db.execute(`
        SELECT 1 FROM lecturer_courses lc
        WHERE lc.lecturer_id = ? AND lc.course_id = ?
      `, [currentUser.id, report.course_id]);

      if (courseCheck.length > 0) {
        req.report = report;
        return next();
      }
    }

    res.status(403).json({ error: 'Access denied to this report.' });
  } catch (error) {
    console.error('Report access validation error:', error);
    res.status(500).json({ error: 'Access validation failed.' });
  }
};

// Optional authentication (for public dashboard)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      const [users] = await req.db.execute(
        'SELECT id, username, email, role, first_name, last_name FROM users WHERE id = ? AND is_active = TRUE',
        [decoded.userId]
      );

      if (users.length > 0) {
        req.user = users[0];
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = {
  verifyToken,
  authorize,
  authorizeOwnerOrHigher,
  validateReportAccess,
  optionalAuth
};
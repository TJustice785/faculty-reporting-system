const express = require('express');
const { optionalAuth, verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/public - Public dashboard data (visible before login)
router.get('/public', optionalAuth, async (req, res) => {
  try {
    // Defaults
    let generalStatsRow = {
      total_users: 0,
      total_students: 0,
      total_lecturers: 0,
      total_courses: 0,
      total_streams: 0,
    };
    let recentActivity = [];
    let courseStats = [];
    let totalUsers = 0;
    let totalReports = 0;
    let latestUsers = [];
    let latestReports = [];
    let trends = { reports_weekly: [] };

    // General statistics (independent subselects)
    try {
      const [gs] = await req.db.execute(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_users,
          (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = TRUE) AS total_students,
          (SELECT COUNT(*) FROM users WHERE role = 'lecturer' AND is_active = TRUE) AS total_lecturers,
          (SELECT COUNT(*) FROM courses) AS total_courses,
          (SELECT COUNT(*) FROM streams) AS total_streams
      `);
      if (gs && gs[0]) generalStatsRow = gs[0];
    } catch (_) {}

    // Recent activity (reports feed)
    try {
      const [ra] = await req.db.execute(`
        SELECT 
          'report' as activity_type,
          r.created_at,
          u.role as user_role,
          c.course_name
        FROM reports r
        JOIN users u ON r.reporter_id = u.id
        LEFT JOIN courses c ON r.course_id = c.id
        ORDER BY r.created_at DESC
        LIMIT 10
      `);
      recentActivity = ra;
    } catch (_) {}

    // Course statistics by stream
    try {
      const [cs] = await req.db.execute(`
        SELECT 
          s.stream_name,
          COUNT(c.id) as course_count,
          COUNT(DISTINCT se.student_id) as enrolled_students
        FROM streams s
        LEFT JOIN courses c ON s.id = c.stream_id
        LEFT JOIN student_enrollments se ON c.id = se.course_id
        GROUP BY s.id, s.stream_name
      `);
      courseStats = cs;
    } catch (_) {}

    // Public trends: weekly reports for last 12 weeks
    try {
      const [rt] = await req.db.execute(`
        SELECT 
          to_char(date_trunc('week', created_at), 'YYYY-IW') AS label,
          COUNT(*)::int AS count
        FROM reports
        WHERE created_at >= (CURRENT_DATE - INTERVAL '12 weeks')
        GROUP BY 1
        ORDER BY 1 ASC
      `);
      trends.reports_weekly = rt || [];
    } catch (_) {}

    // Flat totals
    try {
      const [tu] = await req.db.execute(`SELECT COUNT(*) AS count FROM users WHERE is_active = TRUE`);
      totalUsers = tu?.[0]?.count || 0;
    } catch (_) {}
    try {
      const [tr] = await req.db.execute(`SELECT COUNT(*) AS count FROM reports`);
      totalReports = tr?.[0]?.count || 0;
    } catch (_) {}

    // Latest users and reports
    try {
      const [lu] = await req.db.execute(`
        SELECT id, username, email, role, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      `);
      latestUsers = lu;
    } catch (_) {}
    try {
      const [lr] = await req.db.execute(`
        SELECT r.id, r.title, r.status, r.created_at, c.course_name
        FROM reports r
        LEFT JOIN courses c ON r.course_id = c.id
        ORDER BY r.created_at DESC
        LIMIT 5
      `);
      latestReports = lr;
    } catch (_) {}

    return res.json({
      generalStats: generalStatsRow,
      recentActivity,
      courseStats,
      isAuthenticated: !!req.user,
      total_users: totalUsers,
      total_reports: totalReports,
      latest_users: latestUsers,
      latest_reports: latestReports,
      trends,
    });
  } catch (error) {
    console.error('Public dashboard error:', error);
    return res.status(200).json({
      generalStats: {
        total_users: 0,
        total_students: 0,
        total_lecturers: 0,
        total_courses: 0,
        total_streams: 0,
      },
      recentActivity: [],
      courseStats: [],
      isAuthenticated: !!req.user,
      total_users: 0,
      total_reports: 0,
      latest_users: [],
      latest_reports: [],
    });
  }
});

// GET /api/dashboard/pending/count - Count of pending actions per role
router.get('/pending/count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let base = `
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      WHERE r.status = 'submitted'
    `;
    const params = [];

    if (role === 'lecturer') {
      base += ` AND u.role = 'student' AND r.course_id IN (
        SELECT course_id FROM lecturer_courses WHERE lecturer_id = ?
      )`;
      params.push(userId);
    } else if (role === 'program_leader') {
      base += ` AND r.submitted_to_role = 'program_leader' AND u.role IN ('student','lecturer')`;
    } else if (role === 'principal_lecturer') {
      base += ` AND r.submitted_to_role = 'principal_lecturer'`;
    } else if (role === 'faculty_manager' || role === 'admin') {
      // all submitted
    } else if (role === 'student') {
      return res.json({ count: 0 });
    }

    // Get system notifications for this user
    try {
      await req.db.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          type TEXT NOT NULL,
          title TEXT,
          message TEXT,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    } catch (_) {}
    const [systemRows] = await req.db.execute(`
      SELECT 
        'system' as type,
        n.id,
        n.created_at,
        COALESCE(n.title, 'System Update') as title,
        n.message,
        EXISTS (
          SELECT 1 FROM notification_reads nr 
          WHERE nr.user_id = ? AND nr.type = 'system' AND nr.source_id = n.id
        ) AS read
      FROM notifications n
      WHERE n.user_id = ? AND n.type = 'system'
      ORDER BY n.created_at DESC
      LIMIT 10
    `, [userId, userId]);
    notifications = notifications.concat(systemRows.map(n => ({
      ...n,
      message: n.message || ''
    })));

    const sql = `SELECT COUNT(*)::int AS count ${base}`;
    const [rows] = await req.db.execute(sql, params);
    const count = rows?.[0]?.count || 0;
    res.json({ count });
  } catch (error) {
    console.error('Pending count error:', error);
    res.status(500).json({ error: 'Failed to fetch pending count' });
  }
});

// GET /api/dashboard/pending - Role-based pending actions with pagination
router.get('/pending', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let page = parseInt(req.query.page || '1', 10);
    let limit = parseInt(req.query.limit || '10', 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 10;
    const offset = (page - 1) * limit;

    let base = `
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.status = 'submitted'
    `;
    const params = [];

    if (role === 'lecturer') {
      base += ` AND u.role = 'student' AND r.course_id IN (
        SELECT course_id FROM lecturer_courses WHERE lecturer_id = ?
      )`;
      params.push(userId);
    } else if (role === 'program_leader') {
      base += ` AND r.submitted_to_role = 'program_leader' AND u.role IN ('student','lecturer')`;
    } else if (role === 'principal_lecturer') {
      base += ` AND r.submitted_to_role = 'principal_lecturer'`;
    } else if (role === 'faculty_manager' || role === 'admin') {
      // see all submitted
    } else if (role === 'student') {
      // students: pending is empty
      return res.json({ items: [], pagination: { page, limit, total: 0, pages: 1 } });
    }

    const listSql = `
      SELECT r.id, r.title, r.created_at, r.report_type,
             u.first_name, u.last_name, u.role as reporter_role,
             c.course_name
      ${base}
      ORDER BY r.created_at ASC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*)::int as total ${base}`;

    const [rows] = await req.db.execute(listSql, [...params, limit, offset]);
    const [totalRows] = await req.db.execute(countSql, params);
    const total = totalRows?.[0]?.total || 0;
    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({
      items: rows || [],
      pagination: { page, limit, total, pages }
    });
  } catch (error) {
    console.error('Pending actions error:', error);
    res.status(500).json({ error: 'Failed to fetch pending actions' });
  }
});

// GET /api/dashboard/notifications/count - Unread notifications count
router.get('/notifications/count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Ensure notification_reads exists
    await req.db.execute(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        type TEXT NOT NULL,
        source_id INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, type, source_id)
      )
    `);

    // Unread feedback for this user
    const [feedbackUnread] = await req.db.execute(`
      SELECT COUNT(*)::int AS cnt
      FROM feedback f
      WHERE f.feedback_to_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM notification_reads nr
          WHERE nr.user_id = ? AND nr.type = 'feedback' AND nr.source_id = f.id
        )
    `, [userId, userId]);

    // Unread system notifications for this user
    try {
      await req.db.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          type TEXT NOT NULL,
          title TEXT,
          message TEXT,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    } catch (_) {}
    const [systemUnread] = await req.db.execute(`
      SELECT COUNT(*)::int AS cnt
      FROM notifications n
      WHERE n.user_id = ? AND n.type = 'system'
        AND NOT EXISTS (
          SELECT 1 FROM notification_reads nr
          WHERE nr.user_id = ? AND nr.type = 'system' AND nr.source_id = n.id
        )
    `, [userId, userId]);

    // Unread submitted reports relevant to this role
    let reportQuery = `
      SELECT COUNT(*)::int AS cnt
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      WHERE r.status = 'submitted'
    `;
    const params = [];
    if (userRole === 'lecturer') {
      reportQuery += ` AND u.role = 'student' AND r.course_id IN (
        SELECT course_id FROM lecturer_courses WHERE lecturer_id = ?
      ) AND NOT EXISTS (
        SELECT 1 FROM notification_reads nr
        WHERE nr.user_id = ? AND nr.type = 'new_report' AND nr.source_id = r.id
      )`;
      params.push(userId, userId);
    } else if (userRole === 'program_leader') {
      reportQuery += ` AND u.role IN ('student','lecturer') AND r.submitted_to_role = 'program_leader' AND NOT EXISTS (
        SELECT 1 FROM notification_reads nr
        WHERE nr.user_id = ? AND nr.type = 'new_report' AND nr.source_id = r.id
      )`;
      params.push(userId);
    } else if (userRole === 'principal_lecturer') {
      reportQuery += ` AND r.submitted_to_role = 'principal_lecturer' AND NOT EXISTS (
        SELECT 1 FROM notification_reads nr
        WHERE nr.user_id = ? AND nr.type = 'new_report' AND nr.source_id = r.id
      )`;
      params.push(userId);
    } else if (userRole === 'faculty_manager' || userRole === 'admin') {
      reportQuery += ` AND NOT EXISTS (
        SELECT 1 FROM notification_reads nr
        WHERE nr.user_id = ? AND nr.type = 'new_report' AND nr.source_id = r.id
      )`;
      params.push(userId);
    } else {
      // Students: only feedback count applies
      reportQuery = null;
    }

    let newReportUnread = 0;
    if (reportQuery) {
      const [rows] = await req.db.execute(reportQuery, params);
      newReportUnread = rows?.[0]?.cnt || 0;
    }

    const unread = (feedbackUnread?.[0]?.cnt || 0) + newReportUnread + (systemUnread?.[0]?.cnt || 0);
    res.json({ count: unread });
  } catch (error) {
    console.error('Notifications count error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications count' });
  }
});

// POST /api/dashboard/notifications/mark-read - Mark a single notification as read
router.post('/notifications/mark-read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, id } = req.body || {};
    if (!type || !id) return res.status(400).json({ error: 'type and id are required' });
    await req.db.execute(`
      INSERT INTO notification_reads (user_id, type, source_id)
      VALUES (?, ?, ?)
      ON CONFLICT (user_id, type, source_id) DO NOTHING
    `, [userId, String(type), parseInt(id, 10)]);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark-read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// POST /api/dashboard/notifications/mark-all-read - Mark all current notifications as read
router.post('/notifications/mark-all-read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Build current notifications and insert missing reads
    const [feedback] = await req.db.execute(`SELECT 'feedback' as type, id FROM feedback WHERE feedback_to_id = ?`, [userId]);
    const [submitted] = await req.db.execute(`SELECT 'new_report' as type, id FROM reports WHERE status='submitted'`);
    // Include system notifications for this user
    await req.db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        type TEXT NOT NULL,
        title TEXT,
        message TEXT,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const [systemNotifs] = await req.db.execute(`SELECT 'system' as type, id FROM notifications WHERE user_id = ?`, [userId]);
    const all = [...(feedback||[]), ...(submitted||[]), ...(systemNotifs||[])];
    for (const n of all) {
      await req.db.execute(`
        INSERT INTO notification_reads (user_id, type, source_id)
        VALUES (?, ?, ?)
        ON CONFLICT (user_id, type, source_id) DO NOTHING
      `, [userId, n.type, n.id]);
    }
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark-all-read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});
router.get('/personal', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let dashboardData = {
      user: req.user,
      personalStats: {},
      recentReports: [],
      pendingActions: [],
      courses: []
    };

    // Get personal statistics based on role
    switch (userRole) {
      case 'student':
        try {
          const [studentStats] = await req.db.execute(`
            SELECT 
              COUNT(r.id) as my_reports,
              COUNT(CASE WHEN r.status = 'submitted' THEN 1 END) as pending_reports,
              COUNT(DISTINCT se.course_id) as enrolled_courses,
              AVG(cr.rating) as avg_class_rating
            FROM student_enrollments se
            LEFT JOIN reports r ON r.reporter_id = ? AND r.course_id = se.course_id
            LEFT JOIN class_ratings cr ON cr.student_id = ?
            WHERE se.student_id = ?
          `, [userId, userId, userId]);
          dashboardData.personalStats = studentStats[0] || {};
        } catch (_) {
          dashboardData.personalStats = {};
        }
        try {
          const [studentCourses] = await req.db.execute(`
            SELECT 
              c.id, c.course_name, c.course_code,
              s.stream_name,
              pt.completion_percentage
            FROM student_enrollments se
            JOIN courses c ON se.course_id = c.id
            JOIN streams s ON c.stream_id = s.id
            LEFT JOIN progress_tracking pt ON pt.student_id = se.student_id AND pt.course_id = c.id
            WHERE se.student_id = ?
          `, [userId]);
          dashboardData.courses = studentCourses || [];
        } catch (_) {
          dashboardData.courses = [];
        }
        // Recent activity from student's enrolled courses (role-aligned content)
        try {
          const [courseActivity] = await req.db.execute(`
            SELECT 
              r.id, r.title, r.status, r.created_at,
              c.course_name,
              u.first_name, u.last_name, u.role as reporter_role
            FROM student_enrollments se
            JOIN reports r ON r.course_id = se.course_id
            JOIN courses c ON c.id = se.course_id
            JOIN users u ON u.id = r.reporter_id
            WHERE se.student_id = ?
            ORDER BY r.created_at DESC
            LIMIT 5
          `, [userId]);
          dashboardData.courseActivity = courseActivity || [];
        } catch (_) {
          dashboardData.courseActivity = [];
        }

        // If no enrollments, suggest popular/public courses as onboarding help
        try {
          const enrolledCount = Number(dashboardData?.personalStats?.enrolled_courses || 0);
          if (enrolledCount === 0) {
            const [suggestions] = await req.db.execute(`
              SELECT 
                c.id, c.course_name, c.course_code,
                s.stream_name,
                COUNT(DISTINCT se.student_id) as enrolled_students
              FROM courses c
              JOIN streams s ON c.stream_id = s.id
              LEFT JOIN student_enrollments se ON se.course_id = c.id
              GROUP BY c.id, s.stream_name
              ORDER BY enrolled_students DESC NULLS LAST, c.course_name ASC
              LIMIT 5
            `);
            dashboardData.suggestedCourses = suggestions || [];
          }
        } catch (_) { /* ignore suggestions */ }
        break;

      case 'lecturer':
        try {
          const [lecturerStats] = await req.db.execute(`
            SELECT 
              COUNT(DISTINCT lc.course_id) as my_courses,
              COUNT(r.id) as my_reports,
              COUNT(DISTINCT se.student_id) as total_students,
              AVG(cr.rating) as avg_received_rating
            FROM lecturer_courses lc
            LEFT JOIN reports r ON r.reporter_id = ?
            LEFT JOIN student_enrollments se ON se.course_id = lc.course_id
            LEFT JOIN class_ratings cr ON cr.lecturer_id = ?
            WHERE lc.lecturer_id = ?
          `, [userId, userId, userId]);
          dashboardData.personalStats = lecturerStats[0] || {};
        } catch (_) {
          dashboardData.personalStats = {};
        }
        // Peer ratings summary for lecturers (from peer_ratings)
        try {
          const [peer] = await req.db.execute(`
            SELECT AVG(rating)::numeric(10,2) as peer_avg_received, COUNT(*)::int as peer_ratings_count
            FROM peer_ratings
            WHERE rated_lecturer_id = ?
          `, [userId]);
          dashboardData.personalStats = {
            ...dashboardData.personalStats,
            peer_avg_received: peer?.[0]?.peer_avg_received || null,
            peer_ratings_count: peer?.[0]?.peer_ratings_count || 0,
          };
        } catch (_) { /* ignore if table missing */ }
        try {
          const [lecturerCourses] = await req.db.execute(`
            SELECT 
              c.id, c.course_name, c.course_code,
              s.stream_name,
              COUNT(DISTINCT se.student_id) as student_count,
              AVG(cr.rating) as avg_rating
            FROM lecturer_courses lc
            JOIN courses c ON lc.course_id = c.id
            JOIN streams s ON c.stream_id = s.id
            LEFT JOIN student_enrollments se ON se.course_id = c.id
            LEFT JOIN class_ratings cr ON cr.course_id = c.id AND cr.lecturer_id = ?
            WHERE lc.lecturer_id = ?
            GROUP BY c.id
          `, [userId, userId]);
          dashboardData.courses = lecturerCourses || [];
        } catch (_) {
          dashboardData.courses = [];
        }
        try {
          const [pendingStudentReports] = await req.db.execute(`
            SELECT 
              r.id, r.title, r.created_at,
              u.first_name, u.last_name,
              c.course_name
            FROM reports r
            JOIN users u ON r.reporter_id = u.id
            JOIN courses c ON r.course_id = c.id
            JOIN lecturer_courses lc ON lc.course_id = c.id
            WHERE lc.lecturer_id = ? AND r.status = 'submitted' AND u.role = 'student'
            ORDER BY r.created_at ASC
            LIMIT 5
          `, [userId]);
          dashboardData.pendingActions = pendingStudentReports || [];
        } catch (_) {
          dashboardData.pendingActions = [];
        }
        break;

      case 'program_leader':
        try {
          const [plStats] = await req.db.execute(`
            SELECT 
              COUNT(DISTINCT us.stream_id) as managed_streams,
              COUNT(r.id) as reports_to_review,
              COUNT(DISTINCT lc.lecturer_id) as managed_lecturers
            FROM user_streams us
            LEFT JOIN courses c ON c.stream_id = us.stream_id
            LEFT JOIN reports r ON r.course_id = c.id AND r.submitted_to_role = 'program_leader'
            LEFT JOIN lecturer_courses lc ON lc.course_id = c.id
            WHERE us.user_id = ?
          `, [userId]);
          dashboardData.personalStats = plStats[0] || {};
          // Also compute total reports across managed streams for the PL tile
          try {
            const [plTotals] = await req.db.execute(`
              SELECT COUNT(r.id) AS total_reports
              FROM user_streams us
              JOIN courses c ON c.stream_id = us.stream_id
              LEFT JOIN reports r ON r.course_id = c.id
              WHERE us.user_id = ?
            `, [userId]);
            if (plTotals && plTotals[0]) {
              dashboardData.personalStats.total_reports = plTotals[0].total_reports || 0;
            }
          } catch (_) { /* ignore */ }
        } catch (_) {
          dashboardData.personalStats = {};
        }
        try {
          const [pendingLecturerReports] = await req.db.execute(`
            SELECT 
              r.id, r.title, r.created_at,
              u.first_name, u.last_name,
              c.course_name
            FROM reports r
            JOIN users u ON r.reporter_id = u.id
            JOIN courses c ON r.course_id = c.id
            JOIN user_streams us ON us.stream_id = c.stream_id
            WHERE us.user_id = ? AND r.status = 'submitted' AND u.role = 'lecturer'
            ORDER BY r.created_at ASC
            LIMIT 5
          `, [userId]);
          dashboardData.pendingActions = pendingLecturerReports || [];
        } catch (_) {
          dashboardData.pendingActions = [];
        }
        break;

      case 'principal_lecturer':
        try {
          const [prlStats] = await req.db.execute(`
            SELECT 
              COUNT(DISTINCT us.stream_id) as supervised_streams,
              COUNT(r.id) as reports_to_review,
              COUNT(DISTINCT u.id) as supervised_staff
            FROM user_streams us
            LEFT JOIN courses c ON c.stream_id = us.stream_id
            LEFT JOIN reports r ON r.course_id = c.id AND r.submitted_to_role = 'principal_lecturer'
            LEFT JOIN lecturer_courses lc ON lc.course_id = c.id
            LEFT JOIN users u ON u.id = lc.lecturer_id
            WHERE us.user_id = ?
          `, [userId]);
          dashboardData.personalStats = prlStats[0] || {};
          // Also compute total reports across supervised streams for the PRL tile
          try {
            const [prlTotalReports] = await req.db.execute(`
              SELECT COUNT(r.id) AS total_reports
              FROM user_streams us
              JOIN courses c ON c.stream_id = us.stream_id
              LEFT JOIN reports r ON r.course_id = c.id
              WHERE us.user_id = ?
            `, [userId]);
            if (prlTotalReports && prlTotalReports[0]) {
              dashboardData.personalStats.total_reports = prlTotalReports[0].total_reports || 0;
            }
          } catch (_) { /* ignore */ }
        } catch (_) {
          dashboardData.personalStats = {};
        }
        break;

      case 'faculty_manager':
      case 'admin': {
        try {
          const [global] = await req.db.execute(`
            SELECT 
              (SELECT COUNT(*) FROM streams) AS total_streams,
              (SELECT COUNT(*) FROM reports) AS total_reports,
              (SELECT COUNT(*) FROM users WHERE role != 'student' AND is_active = TRUE) AS total_staff,
              (SELECT COUNT(*) FROM reports WHERE status = 'submitted') AS pending_reports
          `);
          dashboardData.personalStats = global[0] || {};
        } catch (_) {
          dashboardData.personalStats = {};
        }
        break;
      }
    }

    // If user is NOT a student and lecturer-style stats are missing, compute them so
    // all non-students have lecturer functionalities (my courses, my reports, students, ratings)
    if (userRole !== 'student' && (dashboardData?.personalStats?.my_courses == null)) {
      try {
        const [lecturerLike] = await req.db.execute(`
          SELECT 
            COUNT(DISTINCT lc.course_id) as my_courses,
            COUNT(r.id) as my_reports,
            COUNT(DISTINCT se.student_id) as total_students,
            AVG(cr.rating) as avg_received_rating
          FROM lecturer_courses lc
          LEFT JOIN reports r ON r.reporter_id = ?
          LEFT JOIN student_enrollments se ON se.course_id = lc.course_id
          LEFT JOIN class_ratings cr ON cr.lecturer_id = ?
          WHERE lc.lecturer_id = ?
        `, [userId, userId, userId]);
        // Merge into personalStats without clobbering existing manager totals
        dashboardData.personalStats = {
          ...dashboardData.personalStats,
          ...(lecturerLike?.[0] || {})
        };
      } catch (_) { /* ignore */ }

      // Courses list with student count and avg rating
      try {
        const [lecCourses] = await req.db.execute(`
          SELECT 
            c.id, c.course_name, c.course_code,
            s.stream_name,
            COUNT(DISTINCT se.student_id) as student_count,
            AVG(cr.rating) as avg_rating
          FROM lecturer_courses lc
          JOIN courses c ON lc.course_id = c.id
          JOIN streams s ON c.stream_id = s.id
          LEFT JOIN student_enrollments se ON se.course_id = c.id
          LEFT JOIN class_ratings cr ON cr.course_id = c.id AND cr.lecturer_id = ?
          WHERE lc.lecturer_id = ?
          GROUP BY c.id, s.stream_name
        `, [userId, userId]);
        dashboardData.courses = lecCourses || [];
      } catch (_) { /* ignore */ }

      // Pending actions: student submitted reports for courses taught by the user
      try {
        const [pendingStudentReports] = await req.db.execute(`
          SELECT 
            r.id, r.title, r.created_at,
            u.first_name, u.last_name,
            c.course_name
          FROM reports r
          JOIN users u ON r.reporter_id = u.id
          JOIN courses c ON r.course_id = c.id
          JOIN lecturer_courses lc ON lc.course_id = c.id
          WHERE lc.lecturer_id = ? AND r.status = 'submitted' AND u.role = 'student'
          ORDER BY r.created_at ASC
          LIMIT 5
        `, [userId]);
        dashboardData.pendingActions = pendingStudentReports || [];
      } catch (_) { /* ignore */ }
    }

    // Personal trends (user's own reports over last 30 days)
    try {
      const [myTrend] = await req.db.execute(`
        SELECT 
          date_trunc('day', created_at)::date AS label,
          COUNT(*)::int AS count
        FROM reports
        WHERE reporter_id = ? AND created_at >= (CURRENT_DATE - INTERVAL '30 days')
        GROUP BY 1
        ORDER BY 1 ASC
      `, [userId]);
      dashboardData.trends = { my_reports_recent: myTrend || [] };
    } catch (_) {
      dashboardData.trends = { my_reports_recent: [] };
    }

    // Get recent reports for the user
    try {
      const [recentReports] = await req.db.execute(`
        SELECT 
          r.id, r.title, r.status, r.created_at,
          c.course_name,
          u.first_name, u.last_name
        FROM reports r
        LEFT JOIN courses c ON r.course_id = c.id
        LEFT JOIN users u ON r.reporter_id = u.id
        WHERE r.reporter_id = ?
        ORDER BY r.created_at DESC
        LIMIT 5
      `, [userId]);
      dashboardData.recentReports = recentReports || [];
    } catch (_) {
      dashboardData.recentReports = [];
    }

    // Notifications preview (latest few of any type relevant to the user)
    try {
      // Feedback to user
      const [fb] = await req.db.execute(`
        SELECT 'feedback' as type, f.id, f.created_at,
               CONCAT(u.first_name,' ',u.last_name) AS from_name,
               LEFT(f.feedback_content, 80) AS message
        FROM feedback f
        JOIN users u ON u.id = f.feedback_from_id
        WHERE f.feedback_to_id = ?
        ORDER BY f.created_at DESC
        LIMIT 3
      `, [userId]);
      // System notifications
      const [sys] = await req.db.execute(`
        SELECT 'system' as type, n.id, n.created_at,
               COALESCE(n.title,'System Update') AS title,
               LEFT(COALESCE(n.message,''), 80) AS message
        FROM notifications n
        WHERE n.user_id = ? AND n.type = 'system'
        ORDER BY n.created_at DESC
        LIMIT 3
      `, [userId]);
      // Role-based new reports preview (limited)
      let roleSql = null; let params = [];
      if (req.user.role === 'lecturer') {
        roleSql = `
          SELECT 'new_report' as type, r.id, r.created_at, r.title,
                 CONCAT(u.first_name,' ',u.last_name) AS from_name
          FROM reports r
          JOIN users u ON r.reporter_id = u.id
          WHERE r.status='submitted' AND u.role='student' AND r.course_id IN (
            SELECT course_id FROM lecturer_courses WHERE lecturer_id = ?
          )
          ORDER BY r.created_at DESC LIMIT 3`;
        params = [userId];
      } else if (['program_leader','principal_lecturer','faculty_manager'].includes(req.user.role)) {
        roleSql = `
          SELECT 'new_report' as type, r.id, r.created_at, r.title,
                 CONCAT(u.first_name,' ',u.last_name) AS from_name
          FROM reports r
          JOIN users u ON r.reporter_id = u.id
          WHERE r.status='submitted'
          ORDER BY r.created_at DESC LIMIT 3`;
      }
      let nr = [];
      if (roleSql) {
        const [rows] = await req.db.execute(roleSql, params);
        nr = rows || [];
      }
      dashboardData.notificationsPreview = [...(fb||[]), ...(sys||[]), ...nr]
        .sort((a,b)=> new Date(b.created_at)-new Date(a.created_at))
        .slice(0,5);
    } catch (_) { /* ignore preview errors */ }

    res.json(dashboardData);

  } catch (error) {
    console.error('Personal dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch personal dashboard data' });
  }
});

// GET /api/dashboard/analytics - Analytics data for higher roles
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    // Time window (days)
    let days = parseInt(req.query.days || '30', 10);
    if (isNaN(days)) days = 30;
    days = Math.min(Math.max(days, 1), 365);

    // Only allow certain roles to access analytics
    const allowedRoles = ['admin', 'program_leader', 'principal_lecturer', 'faculty_manager'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to analytics' });
    }

    // Report trends over time
    const [reportTrends] = await req.db.execute(`
      SELECT 
        date_trunc('day', created_at)::date as report_date,
        COUNT(*) as report_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
      FROM reports
      WHERE created_at >= (CURRENT_DATE - INTERVAL '${days} days')
      GROUP BY date_trunc('day', created_at)::date
      ORDER BY report_date DESC
    `);

    // Rating distribution
    const [ratingDistribution] = await req.db.execute(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM reports
      WHERE rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating
    `);

    // Stream performance
    const [streamPerformance] = await req.db.execute(`
      SELECT 
        s.stream_name,
        COUNT(r.id) as total_reports,
        AVG(r.rating) as avg_rating,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_reports
      FROM streams s
      LEFT JOIN courses c ON s.id = c.stream_id
      LEFT JOIN reports r ON c.id = r.course_id
      GROUP BY s.id, s.stream_name
    `);

    // Course popularity
    const [coursePopularity] = await req.db.execute(`
      SELECT 
        c.course_name,
        COUNT(DISTINCT se.student_id) as enrolled_students,
        COUNT(r.id) as total_reports,
        AVG(cr.rating) as avg_rating
      FROM courses c
      LEFT JOIN student_enrollments se ON c.id = se.course_id
      LEFT JOIN reports r ON c.id = r.course_id
      LEFT JOIN class_ratings cr ON c.id = cr.course_id
      GROUP BY c.id, c.course_name
      ORDER BY enrolled_students DESC
      LIMIT 10
    `);

    res.json({
      reportTrends,
      ratingDistribution,
      streamPerformance,
      coursePopularity
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// GET /api/dashboard/notifications - Get notifications for user
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let page = parseInt(req.query.page || '1', 10);
    let limit = parseInt(req.query.limit || '15', 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 15;

    // Ensure read-tracking table exists
    await req.db.execute(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        type TEXT NOT NULL,
        source_id INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, type, source_id)
      )
    `);

    let notifications = [];

    // Get feedback notifications (when someone gives feedback on your reports)
    const [feedbackNotifications] = await req.db.execute(`
      SELECT 
        'feedback' as type,
        f.id,
        f.created_at,
        f.feedback_content as message,
        f.feedback_type,
        r.title as report_title,
        u.first_name, u.last_name,
        EXISTS (
          SELECT 1 FROM notification_reads nr 
          WHERE nr.user_id = ? AND nr.type = 'feedback' AND nr.source_id = f.id
        ) AS read
      FROM feedback f
      JOIN reports r ON f.report_id = r.id
      JOIN users u ON f.feedback_from_id = u.id
      WHERE f.feedback_to_id = ?
      ORDER BY f.created_at DESC
      LIMIT 10
    `, [userId, userId]);

    notifications = notifications.concat(feedbackNotifications.map(notif => ({
      ...notif,
      title: `New ${notif.feedback_type} on "${notif.report_title}"`,
      message: `${notif.first_name} ${notif.last_name}: ${notif.message.substring(0, 100)}...`
    })));

    // Get report submission notifications (for reviewers)
    if (['lecturer', 'program_leader', 'principal_lecturer', 'faculty_manager'].includes(userRole)) {
      let reportQuery = `
        SELECT 
          'new_report' as type,
          r.id,
          r.created_at,
          r.title as report_title,
          r.report_type,
          u.first_name, u.last_name,
          c.course_name,
          EXISTS (
            SELECT 1 FROM notification_reads nr 
            WHERE nr.user_id = $1 AND nr.type = 'new_report' AND nr.source_id = r.id
          ) AS read
        FROM reports r
        JOIN users u ON r.reporter_id = u.id
        LEFT JOIN courses c ON r.course_id = c.id
        WHERE r.status = 'submitted'
      `;

      let queryParams = [userId];

      // Role-based filtering
      if (userRole === 'lecturer') {
        reportQuery += ` AND u.role = 'student' AND r.course_id IN (
          SELECT course_id FROM lecturer_courses WHERE lecturer_id = $2
        )`;
        queryParams.push(userId);
      } else if (userRole === 'program_leader') {
        reportQuery += ` AND u.role IN ('student', 'lecturer') AND r.submitted_to_role = 'program_leader'`;
      } else if (userRole === 'principal_lecturer') {
        reportQuery += ` AND r.submitted_to_role = 'principal_lecturer'`;
      }

      reportQuery += ` ORDER BY r.created_at DESC LIMIT 5`;

      const [reportNotifications] = await req.db.execute(reportQuery, queryParams);

      notifications = notifications.concat(reportNotifications.map(notif => ({
        ...notif,
        title: `New ${notif.report_type.replace('_', ' ')} submitted`,
        message: `${notif.first_name} ${notif.last_name} submitted "${notif.report_title}"${notif.course_name ? ` for ${notif.course_name}` : ''}`
      })));
    }

    // Sort all notifications by date
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = notifications.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageItems = notifications.slice(start, end);

    res.json({
      notifications: pageItems,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });

  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

module.exports = router;
      
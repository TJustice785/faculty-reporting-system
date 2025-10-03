const express = require('express');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/export/reports/excel - Export reports to Excel
router.get('/reports/excel', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, status, courseId, stream_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build query based on user role and filters
    let query = `
      SELECT 
        r.id,
        r.title,
        r.report_type,
        r.status,
        r.rating,
        r.created_at,
        r.updated_at,
        r.content,
        r.challenges,
        r.recommendations,
        u.first_name as reporter_first_name,
        u.last_name as reporter_last_name,
        u.role as reporter_role,
        c.course_name,
        c.course_code,
        s.stream_name
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      LEFT JOIN streams s ON c.stream_id = s.id
    `;

    let whereConditions = [];
    let queryParams = [];

    // Role-based access control
    switch (userRole) {
      case 'student':
        whereConditions.push('r.reporter_id = ?');
        queryParams.push(userId);
        break;
      case 'lecturer':
        whereConditions.push(`(
          r.reporter_id = ? OR 
          (u.role = 'student' AND r.course_id IN (
            SELECT course_id FROM lecturer_courses WHERE lecturer_id = ?
          ))
        )`);
        queryParams.push(userId, userId);
        break;
      case 'program_leader':
        whereConditions.push(`(
          r.reporter_id = ? OR
          u.role IN ('lecturer', 'student')
        )`);
        queryParams.push(userId);
        break;
      case 'principal_lecturer':
        whereConditions.push(`(
          r.reporter_id = ? OR
          u.role IN ('program_leader', 'lecturer', 'student')
        )`);
        queryParams.push(userId);
        break;
      case 'faculty_manager':
        // Can export all reports
        break;
    }

    // Add filters
    if (startDate) {
      whereConditions.push('r.created_at >= ?');
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push('r.created_at <= ?');
      queryParams.push(endDate + ' 23:59:59');
    }

    if (status) {
      whereConditions.push('r.status = ?');
      queryParams.push(status);
    }

    if (courseId) {
      whereConditions.push('r.course_id = ?');
      queryParams.push(courseId);
    }

    if (stream_id) {
      whereConditions.push('c.stream_id = ?');
      queryParams.push(stream_id);
    }

    // Build final query
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    query += ' ORDER BY r.created_at DESC';

    const [reports] = await req.db.execute(query, queryParams);

    // Transform data for Excel
    const excelData = reports.map(report => ({
      'Report ID': report.id,
      'Title': report.title,
      'Type': report.report_type,
      'Status': report.status,
      'Rating': report.rating || 'N/A',
      'Reporter': `${report.reporter_first_name} ${report.reporter_last_name}`,
      'Reporter Role': report.reporter_role,
      'Course': report.course_name || 'N/A',
      'Course Code': report.course_code || 'N/A',
      'Stream': report.stream_name || 'N/A',
      'Created Date': new Date(report.created_at).toLocaleDateString(),
      'Content': report.content.substring(0, 500) + (report.content.length > 500 ? '...' : ''),
      'Challenges': report.challenges || 'N/A',
      'Recommendations': report.recommendations || 'N/A'
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 10 }, // Report ID
      { wch: 30 }, // Title
      { wch: 15 }, // Type
      { wch: 12 }, // Status
      { wch: 8 },  // Rating
      { wch: 20 }, // Reporter
      { wch: 15 }, // Reporter Role
      { wch: 25 }, // Course
      { wch: 12 }, // Course Code
      { wch: 15 }, // Stream
      { wch: 12 }, // Created Date
      { wch: 50 }, // Content
      { wch: 30 }, // Challenges
      { wch: 30 }  // Recommendations
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reports_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to export reports to Excel' });
  }
});

// GET /api/export/reports/pdf - Export reports to PDF
router.get('/reports/pdf', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, status, courseId, stream_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Use similar query as Excel export
    let query = `
      SELECT 
        r.id,
        r.title,
        r.report_type,
        r.status,
        r.rating,
        r.created_at,
        r.content,
        r.challenges,
        r.recommendations,
        u.first_name as reporter_first_name,
        u.last_name as reporter_last_name,
        u.role as reporter_role,
        c.course_name,
        s.stream_name
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      LEFT JOIN streams s ON c.stream_id = s.id
    `;

    let whereConditions = [];
    let queryParams = [];

    // Role-based access control (same as Excel)
    switch (userRole) {
      case 'student':
        whereConditions.push('r.reporter_id = ?');
        queryParams.push(userId);
        break;
      case 'lecturer':
        whereConditions.push(`(
          r.reporter_id = ? OR 
          (u.role = 'student' AND r.course_id IN (
            SELECT course_id FROM lecturer_courses WHERE lecturer_id = ?
          ))
        )`);
        queryParams.push(userId, userId);
        break;
      // Add other roles as needed
    }

    // Add filters
    if (startDate) {
      whereConditions.push('r.created_at >= ?');
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push('r.created_at <= ?');
      queryParams.push(endDate + ' 23:59:59');
    }

    if (status) {
      whereConditions.push('r.status = ?');
      queryParams.push(status);
    }

    if (courseId) {
      whereConditions.push('r.course_id = ?');
      queryParams.push(courseId);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    query += ' ORDER BY r.created_at DESC LIMIT 100'; // Limit for PDF

    const [reports] = await req.db.execute(query, queryParams);

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reports_${new Date().toISOString().split('T')[0]}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add header
    doc.fontSize(20).text('Faculty Reports Export', { align: 'center' });
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.fontSize(10).text(`Exported by: ${req.user.first_name} ${req.user.last_name} (${req.user.role})`, { align: 'center' });
    doc.moveDown(2);

    // Add reports
    reports.forEach((report, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Report header
      doc.fontSize(16).text(`Report #${report.id}: ${report.title}`, { underline: true });
      doc.moveDown(0.5);

      // Report details
      doc.fontSize(10);
      doc.text(`Type: ${report.report_type}`, { continued: true });
      doc.text(`   Status: ${report.status}`, { continued: true });
      doc.text(`   Rating: ${report.rating || 'N/A'}`);
      
      doc.text(`Reporter: ${report.reporter_first_name} ${report.reporter_last_name} (${report.reporter_role})`);
      doc.text(`Course: ${report.course_name || 'N/A'}`);
      doc.text(`Stream: ${report.stream_name || 'N/A'}`);
      doc.text(`Created: ${new Date(report.created_at).toLocaleDateString()}`);
      doc.moveDown();

      // Content
      doc.fontSize(12).text('Content:', { underline: true });
      doc.fontSize(10).text(report.content, { align: 'justify' });
      doc.moveDown();

      // Challenges
      if (report.challenges) {
        doc.fontSize(12).text('Challenges:', { underline: true });
        doc.fontSize(10).text(report.challenges, { align: 'justify' });
        doc.moveDown();
      }

      // Recommendations
      if (report.recommendations) {
        doc.fontSize(12).text('Recommendations:', { underline: true });
        doc.fontSize(10).text(report.recommendations, { align: 'justify' });
        doc.moveDown();
      }
    });

    // Add footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 50, {
           align: 'center'
         });
    }

    doc.end();

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export reports to PDF' });
  }
});

// GET /api/export/analytics/excel - Export analytics data to Excel
router.get('/analytics/excel', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only allow certain roles to export analytics
    const allowedRoles = ['program_leader', 'principal_lecturer', 'faculty_manager'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to analytics export' });
    }

    // Get various analytics data
    const [reportStats] = await req.db.execute(`
      SELECT 
        s.stream_name,
        c.course_name,
        COUNT(r.id) as total_reports,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_reports,
        COUNT(CASE WHEN r.status = 'rejected' THEN 1 END) as rejected_reports,
        AVG(r.rating) as avg_rating
      FROM streams s
      JOIN courses c ON s.id = c.stream_id
      LEFT JOIN reports r ON c.id = r.course_id
      GROUP BY s.id, c.id
      ORDER BY s.stream_name, c.course_name
    `);

    const [userStats] = await req.db.execute(`
      SELECT 
        u.role,
        u.first_name,
        u.last_name,
        COUNT(r.id) as total_reports,
        AVG(r.rating) as avg_rating,
        MAX(r.created_at) as last_report_date
      FROM users u
      LEFT JOIN reports r ON u.id = r.reporter_id
      WHERE u.is_active = TRUE
      GROUP BY u.id
      ORDER BY u.role, u.last_name
    `);

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();

    // Report statistics sheet
    const reportStatsData = reportStats.map(stat => ({
      'Stream': stat.stream_name,
      'Course': stat.course_name,
      'Total Reports': stat.total_reports,
      'Approved Reports': stat.approved_reports,
      'Rejected Reports': stat.rejected_reports,
      'Average Rating': stat.avg_rating ? parseFloat(stat.avg_rating).toFixed(2) : 'N/A'
    }));

    const reportStatsSheet = XLSX.utils.json_to_sheet(reportStatsData);
    XLSX.utils.book_append_sheet(workbook, reportStatsSheet, 'Report Statistics');

    // User statistics sheet
    const userStatsData = userStats.map(stat => ({
      'Role': stat.role,
      'Name': `${stat.first_name} ${stat.last_name}`,
      'Total Reports': stat.total_reports,
      'Average Rating': stat.avg_rating ? parseFloat(stat.avg_rating).toFixed(2) : 'N/A',
      'Last Report Date': stat.last_report_date ? new Date(stat.last_report_date).toLocaleDateString() : 'Never'
    }));

    const userStatsSheet = XLSX.utils.json_to_sheet(userStatsData);
    XLSX.utils.book_append_sheet(workbook, userStatsSheet, 'User Statistics');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="analytics_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({ error: 'Failed to export analytics to Excel' });
  }
});

module.exports = router;
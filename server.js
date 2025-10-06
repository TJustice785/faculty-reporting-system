const express = require('express');
// Database engines
const { Pool: PgPool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ override: true });

// Import route modules
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');
const adminRoutes = require('./routes/admin');
const notifications = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5003;
// Nodemon restart trigger: env updated (CORS CLIENT_URL)

app.use(helmet());
// Request logging (dev only)
if ((process.env.NODE_ENV || 'development') !== 'production') {
  app.use(morgan('dev'));
}
// Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// If running behind a proxy (e.g., reverse proxy), trust it to get real client IP
app.set('trust proxy', 1);

  // CORS configuration
  const extraAllowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      const isProd = (process.env.NODE_ENV || 'development') === 'production';
      const baseAllowed = [process.env.CLIENT_URL, ...extraAllowed].filter(Boolean);
      const devLocalhosts = [
        // Common Vite/CRA dev ports
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5182',
        'http://localhost:5178',
        'http://localhost:5181',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5182',
        'http://127.0.0.1:5178',
        'http://127.0.0.1:5181',
      ];
      const allowed = isProd ? baseAllowed : [...baseAllowed, ...devLocalhosts];
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('CORS not allowed'), false);
    },
    credentials: true,
  }));

// Rate limiting (protect sensitive routes)
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Math.max(20, Math.floor(RATE_LIMIT_MAX / 2)),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);
app.use('/api/export', exportLimiter);

// Enhanced Database connection configuration (PostgreSQL only)
const DB_CLIENT = 'postgres';
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || 5432, 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin@123',
  database: process.env.DB_NAME || 'faculty-reporting-system1',
  connectionLimit: 10,
};

console.log('🔧 Database Configuration:');
console.log(`   Client: ${DB_CLIENT}`);
console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}`);

function toPostgresPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

  // Initialize PostgreSQL pool and a unified adapter
  let pool;
  let db;

  // Prefer DATABASE_URL if provided by the hosting platform; otherwise use discrete vars
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL for Postgres connection');
    pool = new PgPool({
      connectionString: process.env.DATABASE_URL,
      // Use SSL only when explicitly requested (e.g., managed platforms)
      // Align behavior with scripts/create_admin_user.js
      ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
      max: dbConfig.connectionLimit || 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 60000,
    });
  } else {
    pool = new PgPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      max: dbConfig.connectionLimit || 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 60000,
    });
  }

db = {
  async execute(sql, params = []) {
    const text = toPostgresPlaceholders(sql);
    const result = await pool.query(text, params);
    return [result.rows, null];
  },
  async query(sql, params = []) {
    const text = toPostgresPlaceholders(sql);
    const result = await pool.query(text, params);
    return [result.rows, null];
  },
  async getConnection() {
    const client = await pool.connect();
    return {
      execute: async (sql, params = []) => {
        const text = toPostgresPlaceholders(sql);
        const result = await client.query(text, params);
        return [result.rows, null];
      },
      query: async (sql, params = []) => {
        const text = toPostgresPlaceholders(sql);
        const result = await client.query(text, params);
        return [result.rows, null];
      },
      release: () => client.release(),
    };
  }
};

// Make database available to routes via adapter
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Enhanced database connection test
async function testConnection() {
  let connection;
  try {
    console.log('🔌 Testing database connection...');
    connection = await db.getConnection();
    
    console.log('✅ Database connected successfully!');
    console.log(`📍 Connected to: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`🗄️  Database: ${dbConfig.database}`);
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('🔍 Database query test passed');
    
    // Check if tables exist (PostgreSQL)
    let tableCount = 0;
    const [tables] = await connection.execute(`
      SELECT COUNT(*)::int as table_count
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog','information_schema')
    `);
    tableCount = tables[0]?.table_count || 0;
    
    console.log(`📊 Found ${tableCount} tables in database`);
    
    if (tableCount === 0) {
      console.log('⚠️  Warning: No tables found. You may need to import the database schema.');
      console.log('💡 Create your tables in PostgreSQL (psql/pgAdmin) or apply the Postgres schema file.');
    }
    
    connection.release();
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('🔍 Error details:', error.message);
    
    // Provide helpful PostgreSQL-focused error messages
    if (error.code === '28P01') {
      console.error('💡 Solution: Check your DB_USER and DB_PASSWORD in .env file');
      console.error('   Ensure the role exists in PostgreSQL and has CONNECT privileges');
    } else if (error.code === '3D000') {
      console.error('💡 Solution: Create the database first');
      console.error(`   Run: CREATE DATABASE ${dbConfig.database}; in psql/pgAdmin`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Solution: Make sure PostgreSQL server is running');
      console.error('   Start PostgreSQL service and verify port 5432');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Solution: Check your DB_HOST in .env file');
      console.error('   Use "localhost" or "127.0.0.1" for local PostgreSQL');
    }
    
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Check if PostgreSQL server is running (port 5432)');
    console.error('2. Verify credentials in .env file');
    console.error('3. Test connection with psql or pgAdmin');
    console.error('4. Check firewall settings');
    console.error('5. Ensure database exists and role has access\n');

    // In development, do not exit — start API without DB to unblock frontend wiring
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      console.warn('⚠️  Continuing without database connection (development mode).');
      return; // allow server to start
    }

    // In production, fail fast
    process.exit(1);
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notifications.router);

// Simple public test endpoint to verify routing without auth
app.get('/api/users/public-test', (req, res) => {
  console.log('Hit /api/users/public-test');
  res.json({
    message: 'Users public test endpoint OK (server.js)',
  });
});

// Swagger UI: serve spec and UI
const swaggerPath = path.join(__dirname, 'openapi.yaml');
app.get('/api/docs.yaml', (req, res) => {
  res.sendFile(swaggerPath);
});
try {
  const swaggerSpec = YAML.load(swaggerPath);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📘 Swagger UI available at /api/docs');
} catch (e) {
  console.warn('⚠️  Swagger setup skipped:', e.message);
}

// Health check endpoint with database status
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const connection = await db.getConnection();
    const [result] = await connection.execute('SELECT 1 as db_status');
    connection.release();
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'Connected',
      db_client: DB_CLIENT,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'Service Unavailable', 
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message
    });
  }
});

// Database connection test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const connection = await db.getConnection();
    
    // Get database info
    let dbInfo = [];
    const [info] = await connection.execute(`
      SELECT current_database() as current_database,
             current_user as current_user,
             version() as db_version
    `);
    dbInfo = info;
    
    // Get table count
    let tableCount; 
    const [tc] = await connection.execute(`
      SELECT COUNT(*)::int as table_count
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog','information_schema')
    `);
    tableCount = tc;
    
    // Get user count (if users table exists)
    let userCount = 0;
    try {
      const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
      userCount = users[0].count;
    } catch (e) {
      // Table might not exist yet
    }
    
    connection.release();
    
    res.json({
      status: 'Connected',
      database: dbInfo[0]?.current_database,
      user: dbInfo[0]?.current_user,
      db_version: dbInfo[0]?.db_version,
      tables: tableCount[0]?.table_count || 0,
      users: userCount,
      host: `${dbConfig.host}:${dbConfig.port}`
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: error.message,
      code: error.code
    });
  }
});

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err);
  
  if (err.code === 'ECONNREFUSED') {
    console.error('🚫 Database connection was refused.');
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

async function startServer() {
  try {
    // Start listening first so frontend can reach API even if DB is down
    const server = app.listen(PORT, () => {
      console.log('\n🚀 Faculty Reporting System Server Started!');
      console.log('=====================================');
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`🎯 API: http://localhost:${PORT}/api`);
      console.log(`📊 Health: http://localhost:${PORT}/api/health`);
      console.log(`🔍 DB Test: http://localhost:${PORT}/api/db-test`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('=====================================\n');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('💡 Development Tips:');
        console.log('   - Frontend will run on http://localhost:5173');
        console.log('   - Use pgAdmin/psql to manage database');
        console.log('   - Check /api/health for server status');
        console.log('   - Check /api/db-test for database info\n');
      }
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error('💡 Try a different port or stop the other application');
      } else {
        console.error('❌ Server error:', error.message);
      }
      process.exit(1);
    });
    // Optionally skip DB test when explicitly requested in dev
    if (process.env.SKIP_DB !== '1') {
      testConnection().catch((err) => {
        console.error('❌ Background DB connection test failed:', err.message);
      });
    } else {
      console.warn('⚠️  SKIP_DB=1 set: skipping DB connection test at startup');
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
  try {
    await pool.end();
    console.log('✅ Database connections closed');
    console.log('👋 Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

startServer();

module.exports = app;

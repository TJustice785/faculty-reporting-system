const { Pool } = require('pg');
require('dotenv').config();

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDatabaseConnection() {
  console.log('\n' + '='.repeat(50));
  colorLog('cyan', '🔍 FACULTY REPORTING SYSTEM - DATABASE TEST');
  console.log('='.repeat(50));
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || 5432, 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin@123',
    database: process.env.DB_NAME || 'faculty_reporting',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  // Display configuration (without password)
  console.log('\n📋 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   Password: ${'*'.repeat(dbConfig.password ? dbConfig.password.length : 0)}`);
  
  let pool;
  
  try {
    console.log('\n🔌 Testing database connection...');
    
    // Test basic connection with an explicit timeout guard
    pool = new Pool(dbConfig);
    const connectWithTimeout = (ms) => new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(Object.assign(new Error(`Connection timed out after ${ms}ms`), { code: 'ECONNTIMEOUT' }));
        }
      }, ms);
      pool.connect().then((client) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(client);
        } else {
          client.release();
        }
      }).catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
    });

    const client = await connectWithTimeout(8000);
    colorLog('green', '✅ Successfully connected to PostgreSQL!');
    
    // Test database selection and version
    const info = await client.query('SELECT current_database() as current_db, current_user as current_user, version() as db_version');
    console.log(`📍 Current database: ${info.rows[0].current_db}`);
    console.log(`🏷️  PostgreSQL version: ${info.rows[0].db_version}`);
    
    // Check if database exists and has tables
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog','information_schema')
      ORDER BY table_name
    `);
    const tables = tablesRes.rows.map(r => ({ TABLE_NAME: r.table_name }));
    
    console.log(`\n📊 Database Analysis:`);
    console.log(`   Tables found: ${tables.length}`);
    
    if (tables.length === 0) {
      colorLog('yellow', '⚠️  Warning: No tables found in database!');
      colorLog('yellow', '💡 You need to apply the PostgreSQL schema');
      console.log('\nSteps to fix:');
      console.log('1. Open pgAdmin or use psql CLI');
      console.log('2. Connect to your database');
      console.log('3. Run faculty-reporting-system/database.pg.sql');
      console.log('4. Verify tables appear under your database');
    } else {
      colorLog('green', '✅ Database tables found:');
      tables.forEach(table => {
        console.log(`   📋 ${table.TABLE_NAME}`);
      });
    }
    
    // Test some basic queries if tables exist
    if (tables.length > 0) {
      console.log('\n🧪 Testing database queries:');
      
      // Test users table
      try {
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        console.log(`   👥 Users: ${userCount.rows[0].count}`);
        
        if (parseInt(userCount.rows[0].count, 10) > 0) {
          const sampleUsers = await client.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            WHERE is_active = TRUE 
            GROUP BY role 
            ORDER BY count DESC
          `);
          console.log('   📊 User roles:');
          sampleUsers.rows.forEach(user => {
            console.log(`      - ${user.role}: ${user.count}`);
          });
        }
      } catch (error) {
        colorLog('yellow', '   ⚠️  Could not query users table');
      }
      
      // Test reports table
      try {
        const reportCount = await client.query('SELECT COUNT(*) as count FROM reports');
        console.log(`   📄 Reports: ${reportCount.rows[0].count}`);
      } catch (error) {
        colorLog('yellow', '   ⚠️  Could not query reports table');
      }
      
      // Test courses table
      try {
        const courseCount = await client.query('SELECT COUNT(*) as count FROM courses');
        console.log(`   📚 Courses: ${courseCount.rows[0].count}`);
      } catch (error) {
        colorLog('yellow', '   ⚠️  Could not query courses table');
      }
    }
    
    // Pool already created; quick query to verify pool
    console.log('\n🔄 Testing connection pool...');
    const poolCheck = await pool.query('SELECT 1 as ok');
    if (poolCheck && poolCheck.rows && poolCheck.rows.length === 1) {
      colorLog('green', '✅ Connection pool test passed!');
    }
    
    // Final success message
    console.log('\n' + '='.repeat(50));
    colorLog('green', '🎉 ALL DATABASE TESTS PASSED!');
    console.log('='.repeat(50));
    
    console.log('\n✨ Your database is ready for the Faculty Reporting System!');
    console.log('\nNext steps:');
    console.log('1. Start your server: npm run server');
    console.log('2. Start your frontend: cd client && npm start');
    console.log('3. Visit: http://localhost:3000');
    
    if (tables.length === 0) {
      console.log('\n⚠️  Remember to import the database schema first!');
    }
    
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    colorLog('red', '❌ DATABASE CONNECTION FAILED!');
    console.log('='.repeat(50));
    
    colorLog('red', `\n💥 Error: ${error.message}`);
    colorLog('red', `🔍 Error Code: ${error.code}`);
    
    console.log('\n🔧 Troubleshooting Guide:');
    
    switch (error.code) {
      case '28P01': // invalid_password
        colorLog('yellow', '🔐 Authentication Error');
        console.log('Solutions:');
        console.log('1. Check your DB_PASSWORD in .env file');
        console.log('2. Verify username and password in PostgreSQL');
        console.log('3. Try connecting with psql or pgAdmin');
        console.log('4. Check if role has proper permissions');
        break;
        
      case 'ECONNREFUSED':
        colorLog('yellow', '🚫 Connection Refused');
        console.log('Solutions:');
        console.log('1. Start PostgreSQL server/service');
        console.log('2. Check if PostgreSQL is running on port 5432');
        console.log('3. Try: net start postgresql-x64-16 (Windows, version may vary)');
        console.log('4. Try: sudo systemctl start postgresql (Linux)');
        console.log('5. Check firewall settings');
        break;
        
      case '3D000': // invalid_catalog_name
        colorLog('yellow', '🗄️  Database Not Found');
        console.log('Solutions:');
        console.log('1. Create database in PostgreSQL:');
        console.log(`   CREATE DATABASE ${dbConfig.database};`);
        console.log('2. Make sure you spelled the database name correctly');
        break;
        
      case 'ENOTFOUND':
        colorLog('yellow', '🌐 Host Not Found');
        console.log('Solutions:');
        console.log('1. Check DB_HOST in .env file');
        console.log('2. Use "localhost" or "127.0.0.1" for local PostgreSQL');
        console.log('3. Verify PostgreSQL server address');
        break;
        
      case 'ETIMEDOUT':
        colorLog('yellow', '⏰ Connection Timeout');
        console.log('Solutions:');
        console.log('1. Check network connectivity');
        console.log('2. Verify PostgreSQL server is responsive');
        console.log('3. Check firewall settings');
        console.log('4. Try increasing timeout in connection config');
        break;
        
      default:
        colorLog('yellow', '❓ Unknown Error');
        console.log('Solutions:');
        console.log('1. Check PostgreSQL server is running');
        console.log('2. Verify all credentials in .env file');
        console.log('3. Test connection with psql/pgAdmin');
        console.log('4. Check PostgreSQL error logs');
    }
    
    console.log('\n📋 Checklist:');
    console.log('□ PostgreSQL Server is installed and running');
    console.log('□ psql/pgAdmin can connect successfully');
    console.log('□ .env file exists with correct database credentials');
    console.log('□ Database exists (or will be created)');
    console.log('□ Role has proper permissions');
    console.log('□ Port 5432 is not blocked by firewall');
    
    console.log('\n💡 Quick Test:');
    console.log('1. Use psql or open pgAdmin');
    console.log('2. Try connecting with the same credentials');
    console.log('3. If CLI/pgAdmin works, the issue is in your .env file');
    console.log('4. If it fails, fix PostgreSQL server first');
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 Database connection pool closed');
    }
  }
}

// Enhanced environment check
function checkEnvironment() {
  console.log('\n🔍 Environment Check:');
  
  const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    colorLog('red', '❌ Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    
    console.log('\n💡 Solution:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Update .env with your MySQL credentials');
    console.log('3. Make sure .env is in your project root directory');
    
    return false;
  }
  
  colorLog('green', '✅ All required environment variables found');
  return true;
}

// Main execution
async function main() {
  console.log('Faculty Reporting System - PostgreSQL Connection Test');
  console.log('Node.js version:', process.version);
  console.log('Current directory:', process.cwd());
  
  if (!checkEnvironment()) {
    process.exit(1);
  }
  
  await testDatabaseConnection();
}

main().catch(error => {
  colorLog('red', '💥 Unexpected error:');
  console.error(error);
  process.exit(1);
});
    
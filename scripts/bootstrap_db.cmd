@echo off
REM bootstrap_db.cmd - Windows batch helper
REM Usage:
REM   scripts\bootstrap_db.cmd DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME ADMIN_USER ADMIN_EMAIL ADMIN_PASS

if "%1"=="" (
  echo Usage: %0 DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME ADMIN_USER ADMIN_EMAIL ADMIN_PASS
  goto :eof
)

set DB_HOST=%1
set DB_PORT=%2
set DB_USER=%3
set DB_PASSWORD=%4
set DB_NAME=%5
set ADMIN_USER=%6
set ADMIN_EMAIL=%7
set ADMIN_PASS=%8

echo DB connection: %DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%

node scripts\apply_pg_schema.js
if errorlevel 1 (
  echo apply_pg_schema.js failed
  exit /b 1
)

node scripts\create_admin_user.js --username "%ADMIN_USER%" --email "%ADMIN_EMAIL%" --password "%ADMIN_PASS%"
if errorlevel 1 (
  echo create_admin_user.js failed
  exit /b 1
)

echo Done. Schema applied and admin user ensured.

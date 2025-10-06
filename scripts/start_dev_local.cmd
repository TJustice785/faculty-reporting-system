@echo off
REM start_dev_local.cmd - Start dev servers with local Postgres DATABASE_URL
REM Adjust values if your local DB credentials change.

setlocal
set DATABASE_URL=postgresql://postgres:admin%40123@localhost:5432/faculty-reporting-system1
set DATABASE_SSL=

echo Using DATABASE_URL=%DATABASE_URL%
npm run dev
endlocal

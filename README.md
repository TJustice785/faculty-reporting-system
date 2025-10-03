# Faculty Reporting System

This is a full-stack application with a Node.js/Express backend and a React (Vite) frontend. It supports authentication, report submission/review, dashboards, and exports.

## Structure

- `client/` — React frontend
  - `public/`
  - `src/`
    - `components/`
    - `context/`
    - `pages/`
    - `services/`
    - `App.jsx`
  - `package.json`
- `routes/` — Express routes
  - `auth.js`
  - `reports.js`
  - `users.js`
  - `dashboard.js`
  - `export.js`
- `middleware/` — Express middleware
  - `auth.js`
- `database.pg.sql` — PostgreSQL schema
- `server.js` — Main server file
- `package.json` — Server dependencies and scripts

## Getting Started

- Server (backend):
  1. `cd faculty-reporting-system`
  2. `npm install`
  3. Apply PostgreSQL schema (first run): `npm run apply:pg`
  4. (Optional) Grant privileges: `npm run grant:pg`
  5. (Optional) Seed demo data: `npm run seed:pg`
  6. Start dev server: `npm run dev` (API at `http://localhost:5003/api`)

- Client (frontend):
  1. `cd faculty-reporting-system/client`
  2. `npm install`
  3. Start dev server: `npm run dev` (Vite will choose a free port, e.g. `http://localhost:5178`)

## Environment

Create `.env` in the project root for server configuration (example values):

```
NODE_ENV=development
PORT=5003
CLIENT_URL=http://localhost:5178

# Database (PostgreSQL)
DB_CLIENT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=faculty_reporting_system
DB_PASSWORD=admin@123
DB_NAME=faculty_reporting_system

# Admin account for schema/privileges (optional)
DB_ADMIN_USER=postgres
DB_ADMIN_PASSWORD=admin@123

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

Create `client/.env` for the frontend API base:

```
VITE_API_URL=http://localhost:5003/api
```

## Useful URLs

- API base: `http://localhost:5003/api`
- Health: `http://localhost:5003/api/health`
- DB Test: `http://localhost:5003/api/db-test`
- Swagger UI: `http://localhost:5003/api/docs`

## Notes

- The backend is PostgreSQL-only using the `pg` driver. Any older MySQL artifacts are deprecated and not used by the running server.
- Rate limiting is lenient in development and stricter in production. Adjust in `server.js` if needed.

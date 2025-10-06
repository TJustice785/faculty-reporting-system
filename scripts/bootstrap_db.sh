#!/usr/bin/env bash
# bootstrap_db.sh
# Usage examples:
#   ./scripts/bootstrap_db.sh --db-url "postgres://user:pass@host:5432/dbname" --admin-user admin --admin-email admin@example.com --admin-pass "P@ssw0rd"
#   or set env vars DATABASE_URL/DB_HOST/DB_USER/DB_PASSWORD/DB_NAME then run without args

set -euo pipefail

print_help() {
  cat <<'EOF'
Usage: bootstrap_db.sh [--db-url <DATABASE_URL>] [--db-host HOST --db-user USER --db-password PASS --db-name NAME] --admin-user USER --admin-email EMAIL --admin-pass PASS

This script will:
  - Use provided DB connection info (DATABASE_URL preferred) or environment variables
  - Run node scripts/apply_pg_schema.js to create/apply schema
  - Run node scripts/create_admin_user.js to create/update admin user non-interactively

Environment variables supported (will be used if corresponding args are not provided):
  DATABASE_URL or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

Examples:
  DATABASE_URL="postgres://user:pass@host:5432/dbname" ./scripts/bootstrap_db.sh --admin-user admin --admin-email admin@example.com --admin-pass "P@ssw0rd"

EOF
}

# simple arg parsing
DB_URL=""
DB_HOST=""
DB_PORT="5432"
DB_USER=""
DB_PASSWORD=""
DB_NAME=""
ADMIN_USER=""
ADMIN_EMAIL=""
ADMIN_PASS=""

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --db-url) DB_URL="$2"; shift 2;;
    --db-host) DB_HOST="$2"; shift 2;;
    --db-port) DB_PORT="$2"; shift 2;;
    --db-user) DB_USER="$2"; shift 2;;
    --db-password) DB_PASSWORD="$2"; shift 2;;
    --db-name) DB_NAME="$2"; shift 2;;
    --admin-user) ADMIN_USER="$2"; shift 2;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2;;
    --admin-pass) ADMIN_PASS="$2"; shift 2;;
    -h|--help) print_help; exit 0;;
    *) echo "Unknown arg: $1"; print_help; exit 1;;
  esac
done

# Fallback to env vars
: "${DATABASE_URL:=${DB_URL}}"
: "${DB_HOST:=${DB_HOST}}"
: "${DB_PORT:=${DB_PORT}}"
: "${DB_USER:=${DB_USER}}"
: "${DB_PASSWORD:=${DB_PASSWORD}}"
: "${DB_NAME:=${DB_NAME}}"
: "${ADMIN_USER:=${ADMIN_USER}}"
: "${ADMIN_EMAIL:=${ADMIN_EMAIL}}"
: "${ADMIN_PASS:=${ADMIN_PASS}}"

if [[ -z "${ADMIN_USER}" || -z "${ADMIN_EMAIL}" || -z "${ADMIN_PASS}" ]]; then
  echo "ERROR: admin user/email/password must be provided via args or env vars (--admin-user/--admin-email/--admin-pass)"
  exit 1
fi

# If DATABASE_URL provided, also export DB_* for apply_pg_schema.js convenience
if [[ -n "${DATABASE_URL}" ]]; then
  echo "Using DATABASE_URL"
  export DATABASE_URL
  # try parse DATABASE_URL to set DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME if missing
  if [[ -z "${DB_HOST}" || -z "${DB_USER}" || -z "${DB_PASSWORD}" || -z "${DB_NAME}" ]]; then
    # crude parsing
    proto_removed=${DATABASE_URL#*://}
    userinfo=${proto_removed%%@*}
    hostinfo=${proto_removed#*@}
    hostport=${hostinfo%%/*}
    dbname=${hostinfo#*/}
    user=${userinfo%%:*}
    pass=${userinfo#*:}
    host=${hostport%%:*}
    port=${hostport#*:}
    export DB_HOST=${DB_HOST:-$host}
    export DB_PORT=${DB_PORT:-$port}
    export DB_USER=${DB_USER:-$user}
    export DB_PASSWORD=${DB_PASSWORD:-$pass}
    export DB_NAME=${DB_NAME:-$dbname}
  fi
fi

# Ensure required DB_* present
if [[ -z "${DB_HOST}" || -z "${DB_USER}" || -z "${DB_PASSWORD}" || -z "${DB_NAME}" ]]; then
  echo "ERROR: Missing DB connection info. Provide DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME."
  exit 1
fi

export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME

echo "DB connection: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Running apply_pg_schema.js..."
node scripts/apply_pg_schema.js
RC=$?
if [[ $RC -ne 0 ]]; then
  echo "apply_pg_schema.js failed with exit code $RC"
  exit $RC
fi

echo "Creating admin user: ${ADMIN_USER} <${ADMIN_EMAIL}>"
node scripts/create_admin_user.js --username "${ADMIN_USER}" --email "${ADMIN_EMAIL}" --password "${ADMIN_PASS}"
RC=$?
if [[ $RC -ne 0 ]]; then
  echo "create_admin_user.js failed with exit code $RC"
  exit $RC
fi

echo "Done. Schema applied and admin user ensured." 

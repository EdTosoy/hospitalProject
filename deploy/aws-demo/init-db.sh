#!/bin/bash
set -euo pipefail
# The stock PostgreSQL entrypoint runs this only for an empty data directory.
# No password on the command line, no SQL echo, and error-statement logging is off.
export ABOX_APP_PASSWORD
ABOX_APP_PASSWORD=$(cat /run/secrets/app_password)
[[ "$ABOX_APP_PASSWORD" =~ ^[a-f0-9]{64}$ ]]
psql --no-psqlrc --username "$POSTGRES_USER" --dbname postgres --set ON_ERROR_STOP=1 <<'SQL'
\getenv app_password ABOX_APP_PASSWORD
CREATE ROLE abox_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_password';
CREATE DATABASE abox_demo OWNER abox_app;
SQL
unset ABOX_APP_PASSWORD

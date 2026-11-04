#!/bin/bash
# Cria o papel da aplicação: sem privilégios especiais e sem poder contornar o RLS (ADR-002, multi-organização).
# A API liga-se sempre com este papel, nunca com o superutilizador.
set -euo pipefail

: "${APP_DB_PASSWORD:?APP_DB_PASSWORD em falta}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_password="$APP_DB_PASSWORD" -v base="$POSTGRES_DB" <<'SQL'
CREATE ROLE app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD :'app_password';
GRANT CONNECT ON DATABASE :"base" TO app;
SQL

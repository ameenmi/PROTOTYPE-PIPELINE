#!/bin/sh
set -eu

PGDATA="${PGDATA:-/data/pg}"
export PGDATA
PGBIN="$(echo /usr/lib/postgresql/*/bin)"
export PATH="$PGBIN:$PATH"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-pipeline}"
export DATABASE_URL="postgresql+psycopg2://postgres:${POSTGRES_PASSWORD}@127.0.0.1:5432/prototype_pipeline"

mkdir -p "$PGDATA"
chown -R postgres:postgres /data

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  su postgres -c "PATH=$PGBIN:\$PATH initdb -D \"$PGDATA\" --username=postgres --auth=trust"
fi

su postgres -c "PATH=$PGBIN:\$PATH pg_ctl -D \"$PGDATA\" -l /tmp/postgres.log -o \"-c listen_addresses=127.0.0.1\" start"

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if su postgres -c "PATH=$PGBIN:\$PATH pg_isready -h 127.0.0.1" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

su postgres -c "psql -v ON_ERROR_STOP=1 -c \"ALTER USER postgres PASSWORD '${POSTGRES_PASSWORD}';\""
su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname = 'prototype_pipeline'\"" | grep -q 1 \
  || su postgres -c "psql -c \"CREATE DATABASE prototype_pipeline\""

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}"

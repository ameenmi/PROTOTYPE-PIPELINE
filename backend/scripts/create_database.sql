-- Create the application database on local PostgreSQL (run as superuser).
-- Example:
--   psql -U postgres -f scripts/create_database.sql

SELECT 'CREATE DATABASE prototype_pipeline'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'prototype_pipeline')\gexec

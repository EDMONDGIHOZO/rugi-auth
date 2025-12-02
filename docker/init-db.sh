#!/bin/bash
set -e

# This script ensures the database and user are created
# It runs automatically when the PostgreSQL container first initializes

echo "Initializing database..."

# Get environment variables with defaults
DB_USER="${POSTGRES_USER:-rugi}"
DB_PASSWORD="${POSTGRES_PASSWORD:-rugi_password}"
DB_NAME="${POSTGRES_DB:-rugi_auth}"

# Check if database exists, if not create it
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    -- Create database if it doesn't exist
    SELECT 'CREATE DATABASE $DB_NAME'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

    -- Grant all privileges on the database
    GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOSQL

echo "Database initialization completed successfully!"
echo "Database: $DB_NAME"
echo "User: $DB_USER"


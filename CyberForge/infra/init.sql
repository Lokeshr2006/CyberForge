-- PostgreSQL initialization script for CyberForge
-- Run automatically by docker-entrypoint-initdb.d

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database (if not exists from POSTGRES_DB env)
-- Note: The main 'cyberforge_db' is created via POSTGRES_DB, this script runs against it

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS audit;

-- Tables will be created by Prisma migrations
-- This file ensures extensions are loaded before migrations run

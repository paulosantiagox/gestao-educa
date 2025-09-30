-- Migration: Add avatar field to users table
-- This migration adds an avatar column to store user profile picture URLs

-- Add avatar column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.avatar IS 'URL of user profile picture/avatar';

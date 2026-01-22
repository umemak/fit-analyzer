-- Migration: Add r2_key column to workouts table
-- This migration adds support for storing workout data in R2 instead of D1

-- Add r2_key column to store the R2 object key
ALTER TABLE workouts ADD COLUMN r2_key TEXT;

-- Create index on r2_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_workouts_r2_key ON workouts(r2_key);

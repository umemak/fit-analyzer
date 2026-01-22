-- D1 Database Schema for FIT Analyzer

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  password_hash TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, provider_id)
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sport TEXT,
  start_time TEXT,
  total_distance REAL,
  total_time INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  avg_pace REAL,
  total_calories INTEGER,
  total_ascent REAL,
  total_descent REAL,
  avg_power INTEGER,
  workout_data TEXT,
  r2_key TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI Analyses table
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL UNIQUE,
  overall_score INTEGER,
  summary TEXT,
  strengths TEXT,
  improvements TEXT,
  recommendations TEXT,
  detailed_analysis TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);

-- Sessions table for auth
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts(created_at);
CREATE INDEX IF NOT EXISTS idx_workouts_r2_key ON workouts(r2_key);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

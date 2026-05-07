-- Add analytics table for tracking user activities
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL, -- login, logout, create_memory, update_memory, delete_memory, view_memory
  memory_id INTEGER,
  metadata TEXT, -- JSON stored as text
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);

-- Add shared memories table (for sharing memories with others)
CREATE TABLE IF NOT EXISTS shared_memories (
  id TEXT PRIMARY KEY, -- UUID for share link
  memory_id INTEGER NOT NULL,
  owner_user_id INTEGER NOT NULL,
  share_type TEXT DEFAULT 'view', -- view, edit
  password TEXT, -- Optional password protection
  expires_at DATETIME, -- Optional expiration
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shared_memories_memory_id ON shared_memories(memory_id);
CREATE INDEX IF NOT EXISTS idx_shared_memories_owner ON shared_memories(owner_user_id);

-- Add favorites/bookmarks table
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  memory_id INTEGER NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  UNIQUE(user_id, memory_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_memory_id ON favorites(memory_id);

-- Add comments table for memories
CREATE TABLE IF NOT EXISTS memory_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id INTEGER, -- For nested comments
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES memory_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_comments_memory_id ON memory_comments(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_comments_user_id ON memory_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_comments_parent ON memory_comments(parent_comment_id);

-- Add notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id INTEGER PRIMARY KEY,
  email_notifications BOOLEAN DEFAULT 1,
  push_notifications BOOLEAN DEFAULT 1,
  memory_reminders BOOLEAN DEFAULT 1,
  weekly_summary BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

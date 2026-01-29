-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wecom_userid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  department TEXT,
  is_signed_in INTEGER DEFAULT 0,
  is_winner INTEGER DEFAULT 0,
  win_time INTEGER,
  prize_id INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

-- 奖品表
CREATE TABLE IF NOT EXISTS prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  total_count INTEGER DEFAULT 0,
  drawn_count INTEGER DEFAULT 0,
  image_url TEXT,
  priority INTEGER DEFAULT 0
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  name TEXT,
  content TEXT NOT NULL,
  created_at INTEGER
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_wecom_userid ON users(wecom_userid);
CREATE INDEX IF NOT EXISTS idx_is_signed_in ON users(is_signed_in);
CREATE INDEX IF NOT EXISTS idx_is_winner ON users(is_winner);

-- 初始数据 (如无数据则插入)
INSERT OR IGNORE INTO prizes (id, name, description, total_count, priority) VALUES 
(1, '三等奖', '京东卡 500元', 10, 1),
(2, '二等奖', 'Switch 游戏机', 5, 2),
(3, '一等奖', 'MacBook Pro', 1, 3);

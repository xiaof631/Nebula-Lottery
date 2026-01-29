-- 用户表 (原 employees)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- 内部自增 ID
  wecom_userid TEXT UNIQUE NOT NULL,    -- 企业微信 UserId (作为唯一标识)
  name TEXT NOT NULL,                   -- 姓名
  avatar_url TEXT,                      -- 头像 URL
  department TEXT,                      -- 部门
  is_signed_in INTEGER DEFAULT 0,       -- 是否已签到 (0:否, 1:是)
  is_winner INTEGER DEFAULT 0,          -- 是否中奖 (0:未中奖, 1:已中奖)
  win_time INTEGER,                     -- 中奖时间戳
  prize_id INTEGER,                     -- 关联的奖品 ID
  created_at INTEGER,                   -- 首次入库时间
  updated_at INTEGER                    -- 最后活跃时间
);

-- 奖品配置表
DROP TABLE IF EXISTS prizes;
CREATE TABLE prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,          -- 奖项名称 (如：一等奖)
  description TEXT,            -- 奖品描述 (如：iPhone 15)
  total_count INTEGER DEFAULT 0, -- 总数量
  drawn_count INTEGER DEFAULT 0, -- 已抽出数量
  image_url TEXT,              -- 奖品图片
  priority INTEGER DEFAULT 0   -- 抽取顺序权重 (越小越先抽，或越大越先抽，视逻辑而定)
);

-- 弹幕消息表
DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  name TEXT,
  content TEXT NOT NULL,
  created_at INTEGER
);

-- 索引优化
CREATE INDEX idx_wecom_userid ON users(wecom_userid);
CREATE INDEX idx_is_signed_in ON users(is_signed_in);
CREATE INDEX idx_is_winner ON users(is_winner);
CREATE INDEX idx_msg_created ON messages(created_at);

-- 初始化一些默认奖品数据 (可选)
INSERT INTO prizes (name, description, total_count, priority) VALUES 
('三等奖', '京东卡 500元', 10, 1),
('二等奖', 'Switch 游戏机', 5, 2),
('一等奖', 'MacBook Pro', 1, 3);

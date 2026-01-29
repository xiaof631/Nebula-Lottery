require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
// Node 18+ has native fetch, but we might need to handle ReadableStream for proxying
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Database Connection
const db = new Database(path.join(__dirname, 'lottery.db')); // synchronous

// Middleware
app.use(cors());
app.use(express.json());

// --- Config ---
const CONFIG = {
  CORP_ID: process.env.WECOM_CORPID,
  SECRET: process.env.WECOM_SECRET,
  AGENT_ID: process.env.WECOM_AGENTID,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  API_URL: process.env.API_URL || `http://localhost:${PORT}`
};

// --- Helpers ---
let tokenCache = { token: null, expires: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expires > now) {
    return tokenCache.token;
  }
  
  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CONFIG.CORP_ID}&corpsecret=${CONFIG.SECRET}`;
  const resp = await fetch(url);
  const data = await resp.json();
  
  if (data.errcode !== 0) throw new Error(`WeCom Token Error: ${data.errmsg}`);
  
  tokenCache = {
    token: data.access_token,
    expires: now + (data.expires_in - 200) * 1000 // Cache with buffer
  };
  return tokenCache.token;
}

async function sendWeComMessage(toUser, content) {
  try {
    const token = await getAccessToken();
    const resp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`, {
      method: 'POST',
      body: JSON.stringify({
        touser: toUser,
        msgtype: "text",
        agentid: CONFIG.AGENT_ID,
        text: { content: content },
        safe: 0
      })
    });
    const data = await resp.json();
    console.log('WeCom Msg Sent:', data);
  } catch (e) {
    console.error('Failed to send WeCom msg:', e);
  }
}

// --- Routes ---

// 1. Auth Login - Redirect to WeCom
app.get('/auth/login', (req, res) => {
  const redirectUri = encodeURIComponent(`${CONFIG.API_URL}/auth/callback`);
  const state = 'nebulalottery';
  const scope = 'snsapi_base';
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${CONFIG.CORP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&agentid=${CONFIG.AGENT_ID}&state=${state}#wechat_redirect`;
  res.redirect(url);
});

// 2. Auth Callback
app.get('/auth/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    const token = await getAccessToken();
    
    // Get User ID
    const infoResp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${token}&code=${code}`);
    const infoData = await infoResp.json();
    if (infoData.errcode !== 0) throw new Error(infoData.errmsg);
    
    const userId = infoData.UserId;

    // Get User Details
    const userResp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${token}&userid=${userId}`);
    const userData = await userResp.json();
    if (userData.errcode !== 0) throw new Error(userData.errmsg);

    const name = userData.name;
    const avatar = userData.avatar || '';
    const department = JSON.stringify(userData.department || []);
    const now = Math.floor(Date.now() / 1000);

    // Upsert User (Sync)
    const stmt = db.prepare(`
      INSERT INTO users (wecom_userid, name, avatar_url, department, created_at, updated_at, is_signed_in, is_winner)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0)
      ON CONFLICT(wecom_userid) DO UPDATE SET
        name = excluded.name,
        avatar_url = excluded.avatar_url,
        updated_at = excluded.updated_at,
        is_signed_in = 1
    `);
    stmt.run(userId, name, avatar, department, now, now);

    res.redirect(`${CONFIG.FRONTEND_URL}?checkin=success&name=${encodeURIComponent(name)}`);

  } catch (e) {
    console.error(e);
    res.status(500).send(`Auth Error: ${e.message}`);
  }
});

// 3. Get Participants
app.get('/api/get-participants', (req, res) => {
  const users = db.prepare(
    "SELECT wecom_userid as id, name, avatar_url as avatar, is_winner FROM users WHERE is_signed_in=1 ORDER BY updated_at DESC"
  ).all();
  res.json(users);
});

// 4. Get Prizes
app.get('/api/get-prizes', (req, res) => {
  const prizes = db.prepare("SELECT * FROM prizes ORDER BY priority ASC").all();
  res.json(prizes);
});

// 5. Draw Winner
app.post('/api/draw', async (req, res) => {
  try {
    const { prizeId } = req.body;
    let prizeName = "幸运奖";
    
    // Transaction
    const winnerData = db.transaction(() => {
      // Check Prize
      if (prizeId) {
        const prize = db.prepare("SELECT * FROM prizes WHERE id = ?").get(prizeId);
        if (!prize) throw new Error("Prize not found");
        if (prize.drawn_count >= prize.total_count) throw new Error("该奖项已抽完");
        prizeName = prize.name;
      }

      // Pick Random
      const winner = db.prepare(
        "SELECT * FROM users WHERE is_signed_in=1 AND is_winner=0 ORDER BY RANDOM() LIMIT 1"
      ).get();

      if (!winner) throw new Error("没有符合条件的人员");

      // Update
      const now = Math.floor(Date.now() / 1000);
      db.prepare("UPDATE users SET is_winner=1, win_time=?, prize_id=? WHERE id=?")
        .run(now, prizeId || null, winner.id);
      
      if (prizeId) {
        db.prepare("UPDATE prizes SET drawn_count = drawn_count + 1 WHERE id = ?").run(prizeId);
      }

      return { winner, prizeName };
    })();

    // Async Notification (Don't wait)
    sendWeComMessage(
      winnerData.winner.wecom_userid,
      `🎉 恭喜你 ${winnerData.winner.name}！\n\n你在年会抽奖中获得【${winnerData.prizeName}】！\n请留意大屏幕或联系工作人员领奖。`
    );

    res.json({
      id: winnerData.winner.wecom_userid,
      name: winnerData.winner.name,
      avatar: winnerData.winner.avatar_url,
      is_winner: 1,
      prize_name: winnerData.prizeName
    });

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 6. Proxy Image (CORS & Format)
app.get('/api/proxy-image', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing url");
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Fetch failed");
    
    res.set('Content-Type', response.headers.get('content-type'));
    res.set('Cache-Control', 'public, max-age=86400');
    
    // Convert Web ReadableStream to Node Stream
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (e) {
    res.status(500).send("Image Proxy Error");
  }
});

// 7. Messages
app.get('/api/get-messages', (req, res) => {
  const msgs = db.prepare("SELECT * FROM messages ORDER BY created_at DESC LIMIT 50").all();
  res.json(msgs);
});

app.post('/api/send-message', (req, res) => {
  const { userId, name, content } = req.body;
  if (!content) return res.status(400).send("Missing content");
  
  const now = Math.floor(Date.now() / 1000);
  db.prepare("INSERT INTO messages (user_id, name, content, created_at) VALUES (?, ?, ?, ?)")
    .run(userId || 'anon', name || '匿名', content, now);
  
  res.json({ success: true });
});

// 8. WeCom Domain Verify File
// 如果需要上传文件验证，可以在这里硬编码返回，或者放在 public 目录下
app.get('/WW_verify_*.txt', (req, res) => {
    // 替换为你的真实文件内容
    res.send('你的校验文件内容');
});

// 9. Serve Frontend (Build) - Optional
// If you want Node to serve the static files too:
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
    // Only serve index.html for non-api routes
    if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
       res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database: ${path.join(__dirname, 'lottery.db')}`);
});

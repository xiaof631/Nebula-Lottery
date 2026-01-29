/**
 * Welcome to Cloudflare Workers!
 *
 * This is the backend logic for WeCom (Enterprise WeChat) OAuth and Lottery Logic.
 */

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: any;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result<any>[]>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  DB: D1Database;
  WECOM_CORPID: string;
  WECOM_SECRET: string;
  WECOM_AGENTID: string;
  WORKER_BASE_URL: string;
  FRONTEND_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/auth/login') return handleLogin(env);
      if (path === '/auth/callback') return handleCallback(request, env);
      
      // API: 获取参与者 (Only signed in)
      if (path === '/api/get-participants') return await handleGetParticipants(env, corsHeaders);

      // API: 获取奖品列表
      if (path === '/api/get-prizes') return await handleGetPrizes(env, corsHeaders);

      // API: 更新奖品数量
      if (path === '/api/update-prize') return await handleUpdatePrize(request, env, corsHeaders);
      
      // API: 抽奖 (含通知)
      if (path === '/api/draw') return await handleDraw(request, env, ctx, corsHeaders);
      
      // API: 发送弹幕
      if (path === '/api/send-message') return await handleSendMessage(request, env, corsHeaders);
      
      // API: 获取弹幕
      if (path === '/api/get-messages') return await handleGetMessages(env, corsHeaders);

      // Utility: 企业微信域名归属权验证
      if (path.match(/^\/WW_verify_.+\.txt$/)) {
        return new Response('这里填入txt文件内的纯文本内容', { 
            headers: { 'Content-Type': 'text/plain' } 
        });
      }

      // Utility: 图片代理 (解决 Canvas 跨域问题)
      if (path === '/api/proxy-image') return await handleProxyImage(request, corsHeaders);

      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (e: any) {
      console.error(e);
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  },
};

// --- Helpers ---

async function getAccessToken(env: Env): Promise<string> {
  // In production, use KV to cache this token!
  const tokenResp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${env.WECOM_CORPID}&corpsecret=${env.WECOM_SECRET}`);
  const tokenData: any = await tokenResp.json();
  if (tokenData.errcode !== 0) throw new Error(`WeCom Token Error: ${tokenData.errmsg}`);
  return tokenData.access_token;
}

async function sendWeComMessage(env: Env, toUser: string, content: string) {
  try {
    const token = await getAccessToken(env);
    const resp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`, {
      method: 'POST',
      body: JSON.stringify({
        touser: toUser,
        msgtype: "text",
        agentid: env.WECOM_AGENTID,
        text: { content: content },
        safe: 0
      })
    });
    const data: any = await resp.json();
    console.log('Notification sent:', data);
  } catch (e) {
    console.error('Failed to send notification', e);
  }
}

// --- Handlers ---

function handleLogin(env: Env): Response {
  const redirectUri = encodeURIComponent(`${env.WORKER_BASE_URL}/auth/callback`);
  const state = 'nebulalottery';
  const scope = 'snsapi_base'; 
  const oauthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${env.WECOM_CORPID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&agentid=${env.WECOM_AGENTID}&state=${state}#wechat_redirect`;
  return Response.redirect(oauthUrl, 302);
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return new Response('Missing code', { status: 400 });

  const tokenResp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${env.WECOM_CORPID}&corpsecret=${env.WECOM_SECRET}`);
  const tokenData: any = await tokenResp.json();
  if (tokenData.errcode !== 0) throw new Error(`WeCom Token Error: ${tokenData.errmsg}`);
  const accessToken = tokenData.access_token;

  const userInfoResp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${accessToken}&code=${code}`);
  const userInfoData: any = await userInfoResp.json();
  if (userInfoData.errcode !== 0) throw new Error(`WeCom UserInfo Error: ${userInfoData.errmsg}`);
  const userId = userInfoData.UserId;

  const userDetailResp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userId}`);
  const userDetail: any = await userDetailResp.json();
  if (userDetail.errcode !== 0) throw new Error(`WeCom UserDetail Error: ${userDetail.errmsg}`);

  const name = userDetail.name;
  const avatar = userDetail.avatar || ''; 
  const department = JSON.stringify(userDetail.department || []);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(`
    INSERT INTO users (wecom_userid, name, avatar_url, department, created_at, updated_at, is_signed_in, is_winner)
    VALUES (?, ?, ?, ?, ?, ?, 1, 0)
    ON CONFLICT(wecom_userid) DO UPDATE SET
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      updated_at = excluded.updated_at,
      is_signed_in = 1
  `).bind(userId, name, avatar, department, now, now).run();

  return Response.redirect(`${env.FRONTEND_URL}?checkin=success&uid=${userId}&name=${encodeURIComponent(name)}`, 302);
}

async function handleGetParticipants(env: Env, corsHeaders: any): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT wecom_userid as id, name, avatar_url as avatar, is_winner FROM users WHERE is_signed_in=1 ORDER BY updated_at DESC"
  ).all();
  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function handleGetPrizes(env: Env, corsHeaders: any): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM prizes ORDER BY priority ASC"
  ).all();
  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function handleUpdatePrize(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  
  const body: any = await request.json().catch(() => ({}));
  const { id, count } = body;
  
  if (!id || count === undefined) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers: corsHeaders });
  }

  const res = await env.DB.prepare("UPDATE prizes SET total_count = ? WHERE id = ?").bind(count, id).run();

  if (res.meta.changes === 0) {
      // NOTE: D1 meta changes check might differ based on version, but this is standard standard SQLite checks
      // Usually need to check if rows matched. For now assuming success if no error.
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}


async function handleDraw(request: Request, env: Env, ctx: ExecutionContext, corsHeaders: any): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  
  const body: any = await request.json().catch(() => ({}));
  const prizeId = body.prizeId;

  // 1. Check Prize Stock
  let prizeName = "幸运奖";
  if (prizeId) {
    const prize: any = await env.DB.prepare("SELECT * FROM prizes WHERE id = ?").bind(prizeId).first();
    if (!prize) {
        return new Response(JSON.stringify({ error: "Prize not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (prize.drawn_count >= prize.total_count) {
        return new Response(JSON.stringify({ error: "该奖项已抽完" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    prizeName = prize.name;
  }

  // 2. Pick Winner
  const stmt = env.DB.prepare(
    "SELECT * FROM users WHERE is_signed_in=1 AND is_winner=0 ORDER BY RANDOM() LIMIT 1"
  );
  const { results } = await stmt.all();

  if (results.length === 0) {
    return new Response(JSON.stringify({ error: "没有符合条件的人员" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const winner: any = results[0];
  const winTime = Math.floor(Date.now() / 1000);

  // 3. Update DB (Transaction-like batch)
  const statements = [
    env.DB.prepare("UPDATE users SET is_winner=1, win_time=?, prize_id=? WHERE id=?").bind(winTime, prizeId || null, winner.id)
  ];

  if (prizeId) {
    statements.push(env.DB.prepare("UPDATE prizes SET drawn_count = drawn_count + 1 WHERE id = ?").bind(prizeId));
  }

  await env.DB.batch(statements);

  // 4. Send Notification
  ctx.waitUntil(
    sendWeComMessage(
      env, 
      winner.wecom_userid, 
      `🎉 恭喜你 ${winner.name}！\n\n你在年会抽奖中获得【${prizeName}】！\n请留意大屏幕或联系工作人员领奖。`
    )
  );

  return new Response(JSON.stringify({
    id: winner.wecom_userid,
    name: winner.name,
    avatar: winner.avatar_url,
    is_winner: 1,
    prize_name: prizeName
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function handleSendMessage(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  
  const body: any = await request.json();
  const { userId, name, content } = body;
  
  if (!content) return new Response('Missing content', { status: 400, headers: corsHeaders });

  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO messages (user_id, name, content, created_at) VALUES (?, ?, ?, ?)"
  ).bind(userId || 'anon', name || '匿名', content, now).run();

  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleGetMessages(env: Env, corsHeaders: any): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM messages ORDER BY created_at DESC LIMIT 50"
  ).all();
  
  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function handleProxyImage(request: Request, corsHeaders: any): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) return new Response('Missing url param', { status: 400, headers: corsHeaders });
    try {
        const imageResp = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!imageResp.ok) throw new Error('Failed to fetch image');
        const blob = await imageResp.blob();
        return new Response(blob, {
            headers: {
                ...corsHeaders,
                'Content-Type': imageResp.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400' 
            }
        });
    } catch (e) {
        return new Response('Fetch failed', { status: 500, headers: corsHeaders });
    }
}
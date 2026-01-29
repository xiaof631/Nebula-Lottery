# 星云年会抽奖系统 (Nebula Lottery)

这是一个基于 React + Three.js 的 4K 大屏抽奖系统，后端使用 Cloudflare Workers + D1 数据库，支持企业微信扫码签到。

## 🚀 快速部署指南

### 前置要求

1.  **Node.js**: 18.0 或更高版本。
2.  **Cloudflare 账号**: 拥有 Workers 和 D1 权限。
3.  **Wrangler CLI**: 全局安装 `npm install -g wrangler`。
4.  **企业微信管理员权限**: 用于创建自建应用获取 Key。

---

### 第一步：后端部署 (Cloudflare Workers)

1.  **登录 Cloudflare**
    ```bash
    npx wrangler login
    ```

2.  **初始化数据库结构**
    您的 `wrangler.toml` 已经配置了数据库 ID。现在需要将表结构写入数据库：
    ```bash
    # 执行 schema.sql (注意：database_name 必须与 wrangler.toml 中一致)
    npx wrangler d1 execute lottery_db --file=worker/schema.sql --remote
    ```

3.  **设置敏感配置 (Secrets)**
    为了安全起见，企业微信的密钥不要写在代码里，请通过以下命令上传到 Cloudflare：
    ```bash
    npx wrangler secret put WECOM_CORPID   # 输入你的企业 ID
    npx wrangler secret put WECOM_SECRET   # 输入应用 Secret
    npx wrangler secret put WECOM_AGENTID  # 输入应用 AgentId
    ```

4.  **发布 Worker**
    ```bash
    npx wrangler deploy
    ```
    *发布成功后，控制台会输出一个 URL（例如 `https://nebula-lottery-api.xxx.workers.dev`）。请复制这个 URL。*

5.  **更新 Worker 配置**
    修改 `wrangler.toml` 中的 `WORKER_BASE_URL` 为上一步获得的真实 URL，然后**再次执行** `npx wrangler deploy` 更新环境变量。

---

### 第二步：前端部署 (Cloudflare Pages)

1.  **配置连接地址**
    打开项目中的 `src/constants.ts` (或 `constants.ts`)，将 `API_BASE_URL` 修改为你的 Worker URL：
    ```typescript
    export const API_BASE_URL = 'https://nebula-lottery-api.your-subdomain.workers.dev';
    ```

2.  **本地构建**
    ```bash
    npm install
    npm run build
    ```
    *构建完成后，通常会在 `dist` 或 `build` 目录下生成静态文件。*

3.  **发布到 Cloudflare Pages**
    ```bash
    npx wrangler pages deploy dist --project-name=nebula-lottery
    ```
    *发布成功后，你会获得一个前端访问地址（例如 `https://nebula-lottery.pages.dev`）。*

4.  **最终回调配置**
    *   **Worker 端**: 修改 `wrangler.toml` 中的 `FRONTEND_URL` 为你的 Pages 地址，并第三次 `npx wrangler deploy`。
    *   **企业微信后台**: 进入应用设置 -> 网页授权及 JS-SDK，将“可信域名”设置为你的 Worker 域名 (不带 `https://`)。

---

### 🛠 使用说明

#### 1. 员工签到
让员工在企业微信中访问以下链接（或配置到应用菜单）：
`https://<YOUR_WORKER_URL>/auth/login`

系统会自动完成 OAuth 授权，记录员工信息，并跳转回大屏前端页面显示“签到成功”。

#### 2. 大屏控制
*   访问前端 Pages 链接。
*   **启动**: 点击“启动抽奖序列”，球体开始旋转。
*   **抽奖**: 点击“锁定 / 揭晓”，后端随机选取一名已签到且未中奖的用户。
*   **复位**: 抽奖结束后点击“系统复位”回到初始状态。

#### 3. 测试模式 (无后端)
如果 API 连接失败，前端会自动降级使用 Mock 数据（虚拟数据），方便在无网络环境下测试 UI 效果。

---

### 📂 目录结构

*   `worker/`: 后端逻辑 (index.ts) 和数据库结构 (schema.sql)。
*   `components/`: React UI 组件 (3D 场景、控制面板)。
*   `services/`: 前端 API 请求与 Mock 数据逻辑。
*   `wrangler.toml`: Cloudflare 项目配置文件。

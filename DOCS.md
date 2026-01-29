
# 星云年会抽奖系统 (Nebula Lottery) - 配置与部署文档

**项目简介**：
这是一个基于 React + Three.js 的 4K 大屏抽奖系统，前端呈现 3D 粒子球特效。
系统支持两种部署模式：
1. **方案 A：Cloudflare Serverless**: 极低成本，全球加速，无需运维服务器 (推荐)。
2. **方案 B：传统云服务器 (火山引擎/ECS)**: Node.js + SQLite 架构，数据完全本地化，适合有现有服务器资源的场景。

---

## 第一章：企业微信申请与配置教程 (通用)

要让抽奖系统的“扫码签到”和“中奖通知”功能正常工作，必须在企业微信管理后台获取核心参数并配置可信域名。

### 1.1 获取 CorpID (企业ID)
1.  登录 [企业微信管理后台](https://work.weixin.qq.com/wework_admin/loginpage_wx)。
2.  点击顶部导航栏的 **我的企业**。
3.  点击左侧菜单的 **企业信息**。
4.  在页面最下方找到 **企业ID** (CorpID)。

### 1.2 创建应用并获取 AgentId 和 Secret
我们需要创建一个“自建应用”来承载抽奖系统。

1.  点击顶部导航栏的 **应用管理**。
2.  在“自建”栏目下，点击 **创建应用**。
3.  **填写应用信息**：
    *   **应用Logo**：上传一张图片（比如抽奖球的图标）。
    *   **应用名称**：填写“年会抽奖”。
    *   **可见范围**：选择全公司，或参与年会的特定部门。
4.  创建完成后，进入该应用详情页，记录以下信息：
    *   **AgentId**：一串数字（例如 `1000001`）。
    *   **Secret**：点击“查看”，需要使用企业微信手机端扫码确认。

### 1.3 配置网页授权可信域名 (关键)
这是最容易出错的一步。如果不配置，用户扫码时会报错“未配置可信域名”。

**操作步骤**：
1.  在刚才创建的应用详情页中，向下滑动找到 **开发者接口** 栏目。
2.  找到 **网页授权及JS-SDK**，点击“申请域名校验”。
3.  **填写域名**：
    *   **Cloudflare 模式**：填写 Worker 域名（如 `nebula-lottery-api.xxx.workers.dev`，**不带** `https://`）。
    *   **云服务器模式**：填写服务器的公网域名（如 `lottery.yourcompany.com`）。
        *   *注意：企业微信通常不支持直接使用 IP 地址进行网页授权，建议绑定域名。如果必须用 IP，请尝试配置但在手机端可能受限。*
4.  **域名归属验证**：
    *   下载校验文件（`WW_verify_xyz.txt`）。
    *   **Cloudflare 模式**：复制文件内容，修改 `worker/index.ts` 中的验证代码部分，重新发布。
    *   **云服务器模式**：修改 `server/index.js` 中的验证路由，或者直接将文件放在 `server` 目录下并配置静态资源服务。

---

## 第二章：部署方案 A - Cloudflare Serverless (推荐)

此方案无需购买服务器，利用 Cloudflare 的免费额度即可承载高并发。

### 2.1 环境密钥配置 (Secrets)
在项目根目录终端执行：
```bash
npx wrangler secret put WECOM_CORPID   # 输入 1.1 获取的企业ID
npx wrangler secret put WECOM_SECRET   # 输入 1.2 获取的 Secret
npx wrangler secret put WECOM_AGENTID  # 输入 1.2 获取的 AgentId
```

### 2.2 后端部署 (Workers + D1)
1.  **数据库初始化**：
    确保 `wrangler.toml` 中的 `database_id` 已替换为您自己的 D1 数据库 ID。
    ```bash
    npx wrangler d1 execute lottery_db --file=worker/schema.sql --remote
    ```
2.  **发布后端**：
    ```bash
    npx wrangler deploy
    ```
3.  **更新 URL**：
    将获得的 Worker URL 更新到 `wrangler.toml` 的 `WORKER_BASE_URL`，再次发布。

### 2.3 前端部署 (Pages)
1.  **连接 API**：修改 `src/constants.ts` 的 `API_BASE_URL` 为 Worker URL。
2.  **构建发布**：
    ```bash
    npm install
    npm run build
    npx wrangler pages deploy dist --project-name=nebula-lottery
    ```

---

## 第三章：部署方案 B - 火山引擎/Linux 服务器 (Node.js + SQLite)

此方案适用于 Ubuntu/CentOS 等标准 Linux 环境，数据存储在本地 SQLite 文件中。

### 3.1 环境准备
在服务器上安装 Node.js (v18+), Nginx 和 PM2。以 Ubuntu 为例：
```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential nginx
# 安装进程管理工具
sudo npm install -g pm2
```

### 3.2 后端部署
1.  将项目文件上传到服务器 `/var/www/lottery` 目录。
2.  进入 `server` 目录，安装依赖：
    ```bash
    cd /var/www/lottery/server
    npm install
    ```
    *注意：`better-sqlite3` 需要编译环境，如果报错请检查是否安装了 `build-essential` 或 `gcc`。*
3.  配置环境变量：
    在 `server` 目录下创建 `.env` 文件：
    ```env
    PORT=3001
    WECOM_CORPID=你的企业ID
    WECOM_SECRET=你的Secret
    WECOM_AGENTID=你的AgentID
    # 如果通过 Nginx 反代，这里通常填写你的公网域名
    FRONTEND_URL=http://lottery.yourcompany.com
    API_URL=http://lottery.yourcompany.com/api
    ```
4.  初始化数据库并启动：
    ```bash
    npm run init-db
    pm2 start index.js --name "lottery-api"
    ```

### 3.3 前端部署
1.  在**本地电脑**上修改 `src/constants.ts`，将 `API_BASE_URL` 设为 `''` (空字符串)。
    *   *解释：设置为空字符串时，前端请求会指向当前域名（如 `/api/draw`），然后由 Nginx 反代到后端端口，这样避免了跨域问题。*
2.  本地构建项目：
    ```bash
    npm run build
    ```
3.  将生成的 `dist` 文件夹上传到服务器 `/var/www/lottery/dist`。

### 3.4 Nginx 配置 (反向代理)
编辑 `/etc/nginx/sites-available/default`：

```nginx
server {
    listen 80;
    server_name lottery.yourcompany.com; # 你的域名或IP

    root /var/www/lottery/dist;
    index index.html;

    # 前端静态资源
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反代
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
    }

    # 认证回调反代
    location /auth/ {
        proxy_pass http://localhost:3001/auth/;
        proxy_set_header Host $host;
    }
}
```
最后重启 Nginx: `sudo systemctl restart nginx`。

---

## 第四章：奖项与获奖人数配置

### 4.1 修改配置脚本
打开 `server/schema.sql` (本地方案) 或 `worker/schema.sql` (Cloudflare方案)，修改底部的 `INSERT` 语句调整奖品名称和数量。

### 4.2 应用更改
*   **方案 A (Cloudflare)**: 运行 `npx wrangler d1 execute lottery_db --file=worker/schema.sql --remote`。
*   **方案 B (Linux)**: 
    *   如果项目刚初始化，运行 `npm run init-db` 即可。
    *   如果项目已运行且已有数据，建议安装 `sqlite3` 命令行工具 (`sudo apt install sqlite3`)，然后运行 `sqlite3 server/lottery.db` 直接执行 SQL 修改数据，避免覆盖用户签到信息。

---

## 附录：保留火山引擎主站的同时绑定 Cloudflare (可选)

如果您选择方案 A 但又想保留火山引擎的服务器运行主站业务，可以采用 DNS 接入方式：

1.  **Cloudflare 设置**: Add Site -> 扫描 DNS -> 确保包含所有火山引擎的 A 记录。
2.  **火山引擎 设置**: 域名管理 -> 修改 DNS 服务器为 Cloudflare 提供的 NS 地址。
3.  **结果**: 主站流量经过 Cloudflare 代理回源到火山引擎，同时您可以添加二级域名（如 `lottery.xxx.com`）给抽奖 Worker 使用。

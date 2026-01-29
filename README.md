# Nebula Lottery (Node.js Backend)

## 架构变更

本项目已从 Serverless 架构调整为传统的 Node.js 架构，以支持火山引擎/ECS 部署。

### 目录结构

```
/
├── client/                # 前端 (React + Vite)
└── server/                # 后端 (Express + SQLite + Node.js)
    ├── index.js           # 核心服务逻辑
    ├── init-db.js         # 数据库初始化脚本
    └── lottery.db         # SQLite 数据库文件 (自动生成)
```

## 本地开发指南

由于本地权限限制，请在 `/tmp` 临时环境中运行：

```bash
# 进入临时环境根目录
cd /tmp/nebula_env/project_copy

# 一键启动 (前后端)
# 前端: http://localhost:5173
# 后端: http://localhost:3001
npm run dev
```

### 生产环境部署 (火山引擎)

1.  将项目上传至服务器。
2.  确保服务器安装了 Node.js 18+。
3.  进入 `server` 目录并安装依赖：
    ```bash
    cd server
    npm install
    # 初始化数据库
    node init-db.js
    # 启动服务
    node index.js
    ```
4.  配置 Nginx 反向代理指向 `localhost:3001`。

# Cloudflare Worker DDNS 服务

多解析 DDNS 服务，运行在 Cloudflare Worker 上，支持 Web 管理界面。

## 功能特性

- 🌐 **多目标解析**：支持多个后端域名解析到同一 DNS 记录
- 📊 **Web 管理界面**：可视化配置和日志查看
- ⏰ **定时同步**：每 5 分钟自动同步
- 💾 **KV 存储**：配置持久化存储
- 🔄 **差异同步**：智能增量更新 DNS 记录

## 部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 创建 KV namespace

```bash
npx wrangler kv namespace create DDNS_CONFIG
```

创建完成后，将输出的 ID 更新到 `wrangler.toml` 中：

```toml
[[kv_namespaces]]
binding = "DDNS_CONFIG"
id = "你的实际 ID"
```

### 4. 设置 API Token

在 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) 创建 API Token，权限需要：
- Zone: Read
- DNS: Edit

然后设置 secret：

```bash
npx wrangler secret put CF_API_TOKEN
```

### 5. 部署

```bash
npm run deploy
```

## 本地开发

```bash
npm run dev
```

访问 http://localhost:8787 打开管理界面。

## 使用说明

1. 访问 Worker URL 打开管理界面
2. 点击「添加配置」添加域名配置
3. 配置说明：
   - **Zone 域名**：主域名（如 `example.com`）
   - **DNS 记录名**：要解析的子域名（如 `app.example.com`）
   - **目标域名**：后端服务域名列表，每行一个
   - **TTL**：DNS 缓存时间（秒）
   - **代理**：是否启用 Cloudflare CDN 代理

4. 点击「立即同步」手动触发，或等待定时任务自动执行

## License

MIT

# Cloudflare Worker DDNS 服务

多解析 DDNS 服务，运行在 Cloudflare Worker 上，支持 Web 管理界面。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ca-lun/cf_ddns)

## 功能特性

- 🌐 **多目标解析**：支持多个后端域名解析到同一 DNS 记录
- 📊 **Web 管理界面**：可视化配置和日志查看
- ⏰ **定时同步**：每 5 分钟自动同步
- 🔐 **可选认证**：支持 Basic 认证

## 部署步骤

1. **点击上方 Deploy 按钮** 或手动 `npx wrangler deploy`
2. **在 Cloudflare Dashboard 创建 KV namespace**
   - Workers & Pages → KV → Create namespace
   - 名称随意，如 `ddns-config`
3. **绑定 KV 到 Worker**
   - Workers → cf-ddns → Settings → Bindings
   - 添加 KV，变量名必须为 `DDNS_CONFIG`
4. **添加环境变量 `CF_API_TOKEN`**
   - Workers → cf-ddns → Settings → Variables
   - 值为你的 [API Token](https://dash.cloudflare.com/profile/api-tokens)（权限：Zone:Read + DNS:Edit）

## 可选：启用认证

在 Worker 设置中添加环境变量：
- `AUTH_USERNAME` - 用户名
- `AUTH_PASSWORD` - 密码

## License

MIT

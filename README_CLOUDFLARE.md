# dataclaw Feishu - Cloudflare Workers 部署指南

这个项目现在支持部署到 Cloudflare Workers，提供全球 CDN 加速和无服务器架构。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 部署到测试环境

```bash
npm run deploy:staging
```

### 4. 部署到生产环境

```bash
npm run deploy:production
```

## 📋 可用命令

| 命令 | 描述 |
|------|------|
| `npm run build:worker` | 构建 Worker 和资源清单 |
| `npm run worker:dev` | 启动本地开发服务器 |
| `npm run worker:preview` | 本地预览（不调用外部 API） |
| `npm run deploy` | 部署到默认环境（staging） |
| `npm run deploy:staging` | 部署到测试环境 |
| `npm run deploy:production` | 部署到生产环境 |

## 🏗️ 架构说明

### Worker 功能

1. **静态文件服务**: 提供 React 应用的静态文件
2. **API 代理**: 代理请求到 Snappdown API
3. **CORS 处理**: 自动添加 CORS 头
4. **SPA 路由**: 支持客户端路由

### 文件结构

```
├── worker/
│   ├── index.js              # Worker 主脚本
│   └── assets-manifest.json  # 生成的资源清单
├── scripts/
│   ├── build-worker.js       # 构建脚本
│   └── deploy.sh            # 部署脚本
├── wrangler.toml            # Cloudflare Workers 配置
└── dist/                    # 构建的 React 应用
```

## ⚙️ 配置

### 环境变量

使用 Wrangler secrets 设置环境变量：

```bash
# 可选：自定义 API 基础 URL
npx wrangler secret put SNAPPDOWN_API_BASE_URL

# 设置其他必要的密钥
npx wrangler secret put YOUR_SECRET_NAME
```

### 自定义域名

1. 进入 Cloudflare 控制台
2. 导航到 Workers & Pages
3. 选择你的 Worker
4. 进入 Settings > Triggers
5. 添加自定义域名

### 环境配置

项目支持多个环境：

- **staging**: `dataclaw-feishu-staging.your-subdomain.workers.dev`
- **production**: `dataclaw-feishu-prod.your-subdomain.workers.dev`

## 🔧 开发

### 本地开发

```bash
# 启动本地开发服务器
npm run worker:dev

# 或者本地预览（不调用外部 API）
npm run worker:preview
```

### 调试

查看实时日志：

```bash
npx wrangler tail
```

### 性能优化

- 静态资源使用适当的缓存头
- API 响应包含 CORS 头
- 二进制文件正确编码/解码

## 🛡️ 安全

- API 密钥通过 Wrangler secrets 安全处理
- CORS 配置允许必要的来源
- Worker 代码中不暴露敏感数据

## 📊 监控

在 Cloudflare 控制台监控你的 Worker：

1. 进入 Workers & Pages
2. 选择你的 Worker
3. 查看指标、日志和性能数据

## 🐛 故障排除

### 常见问题

1. **构建错误**: 确保 `npm run build` 首先成功完成
2. **包大小过大**: Workers 有 1MB 限制，考虑代码分割
3. **API 错误**: 检查 CORS 配置和 API 端点 URL

### 调试步骤

1. 检查构建输出：`npm run build:worker`
2. 查看 Worker 日志：`npx wrangler tail`
3. 测试本地预览：`npm run worker:preview`

## 📝 更新日志

### v1.0.0
- ✅ 支持 Cloudflare Workers 部署
- ✅ 静态文件服务
- ✅ API 代理功能
- ✅ CORS 处理
- ✅ SPA 路由支持
- ✅ 多环境部署

## 🤝 支持

如有问题，请查看：
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [项目主 README](./README.md)
- [部署详细指南](./CLOUDFLARE_DEPLOYMENT.md)

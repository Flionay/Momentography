# OSS Webhook 功能使用说明

本项目实现了一个 webhook 端点，可以在接收到 POST 请求时，从阿里云 OSS 读取数据并更新本地 JSON 数据库。

## 配置说明

1. 在 `.env.local` 文件中配置以下环境变量：

```
# 阿里云 OSS 配置
OSS_ACCESS_KEY=your-access-key
OSS_SECRET_KEY=your-secret-key
OSS_ENDPOINT=your-endpoint
OSS_BUCKET=your-bucket

# Webhook 配置
WEBHOOK_SECRET=your-webhook-secret

# 文件路径配置
EXIF_JSON_PATH=public/data/exif_data.json
ALBUMS_JSON_PATH=public/data/albums.json
```

2. 确保 `public/data` 目录存在并可写入。

## 使用方法

### 手动触发更新

访问 `/admin/oss` 页面，点击"更新数据"按钮手动触发数据更新。

### 通过 Webhook 触发更新

向 `/api/webhook` 端点发送 POST 请求，并在请求头中添加 `x-webhook-secret` 字段，值为配置的 `WEBHOOK_SECRET`。

示例：

```bash
curl -X POST https://your-domain.com/api/webhook \
  -H "x-webhook-secret: your-webhook-secret"
```

## 数据更新流程

1. 从 OSS 获取 `gallery/exif_data.json` 文件，更新本地的 EXIF 数据。
2. 列出 OSS 中 `gallery` 目录下的所有文件，处理 `.webp` 图片和 `.yaml` 配置文件。
3. 生成相册信息，包括图片链接和相册元数据。
4. 将更新后的数据保存到本地的 JSON 文件中。


## 注意事项

- 确保 OSS 的访问密钥具有足够的权限读取 `gallery` 目录下的文件。
- Webhook 密钥应该保密，不要泄露给未授权的人员。
- 数据更新可能需要一些时间，特别是当 OSS 中有大量文件时。 
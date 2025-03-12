# 📸 个人摄影作品集

一个优雅的摄影作品展示网站，基于 Next.js 14 构建，采用现代化的设计理念。

![预览图](public/preview.png)

## ✨ 特性

- 🎨 现代简约的设计风格
- 🌓 自适应深色模式
- 📱 完全响应式布局
- 🗺️ 基于地图的照片浏览
- 📅 时间线式作品展示
- 🏷️ 智能的照片分类
- 📊 EXIF 信息展示
- ⚡️ 快速的图片加载
- 🔍 照片评分系统

## 🛠️ 技术栈

- **框架**: [Next.js 14](https://nextjs.org/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **动画**: [Framer Motion](https://www.framer.com/motion/)
- **图标**: [Phosphor Icons](https://phosphoricons.com/)
- **地图**: [React Leaflet](https://react-leaflet.js.org/)
- **UI组件**: [@headlessui/react](https://headlessui.com/)

## 🚀 快速开始

1. 克隆项目

```bash
git clone https://github.com/yourusername/photo-gallery.git
cd photo-gallery
```

2. 安装依赖

```bash
npm install
# 或
yarn install
```

3. 配置环境变量

```bash
cp .env.example .env.local
```

4. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

5. 访问 [http://localhost:3000](http://localhost:3000)
## 🔧 配置说明

### 环境变量

```env
NEXT_PUBLIC_MAP_API_KEY=your_map_api_key
ADMIN_PASSWORD=your_admin_password
```

### 照片数据结构

```json
{
  "albumName": {
    "title": "相册标题",
    "description": "相册描述",
    "images": [
      "图片URL数组"
    ]
  }
}
```

## 📝 待办事项

- [ ] 添加照片上传功能
- [ ] 优化图片加载性能
- [ ] 添加更多交互动画
- [ ] 实现照片分享功能
- [ ] 添加评论系统

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详细信息

## 👤 作者

作者名字
- Website: [www.angyi.online]
- GitHub: [@flionay]
- Email: [angyi_jq@163.com]
## 🙏 致谢

- 感谢所有贡献者
- 特别感谢 [列出使用的开源项目]
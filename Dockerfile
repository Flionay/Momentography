# 使用官方的 Node.js 作为基础镜像
FROM node:18

# 安装 SQLite 依赖
RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目文件
COPY . .

# 创建数据目录
RUN mkdir -p public/data data

# 构建项目
RUN npm run build

# 设置环境变量
ENV NODE_ENV=production
ENV ADMIN_PASSWORD=${ADMIN_PASSWORD}
ENV AMAP_KEY=${AMAP_KEY}
ENV OSS_ACCESS_KEY=${OSS_ACCESS_KEY}
ENV OSS_SECRET_KEY=${OSS_SECRET_KEY}
ENV OSS_ENDPOINT=${OSS_ENDPOINT}
ENV OSS_BUCKET=${OSS_BUCKET}
ENV WEBHOOK_SECRET=${WEBHOOK_SECRET}
ENV DB_PATH=data/gallery.db

# 暴露应用运行的端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"] 
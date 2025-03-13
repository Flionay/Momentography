export const OSS_CONFIG = {
  // OSS 配置
  ACCESS_KEY: process.env.OSS_ACCESS_KEY || '',
  SECRET_KEY: process.env.OSS_SECRET_KEY || '',
  ENDPOINT: process.env.OSS_ENDPOINT || '',
  BUCKET: process.env.OSS_BUCKET || '',
  
  // 数据库配置
  DB_PATH: process.env.DB_PATH || 'data/gallery.db',
  
  // 文件路径配置
  EXIF_JSON_PATH: process.env.EXIF_JSON_PATH || 'public/data/exif_data.json',
  ALBUMS_JSON_PATH: process.env.ALBUMS_JSON_PATH || 'public/data/albums.json',
  
  // OSS 路径
  OSS_EXIF_DATA_KEY: 'gallery/exif_data.json',
  OSS_GALLERY_PREFIX: 'gallery',
  
  // Webhook 配置
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'update_momentography'
}; 
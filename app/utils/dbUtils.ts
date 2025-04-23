import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { OSS_CONFIG } from '../config/oss';

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), OSS_CONFIG.DB_PATH);

// 确保数据库目录存在
function ensureDbDirExists() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// 初始化数据库连接
export function getDb() {
  ensureDbDirExists();
  return new Database(DB_PATH);
}

// 初始化数据库表
export function initDb() {
  const db = getDb();

  // 创建相册表
  db.exec(`
    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      location TEXT,
      date TEXT,
      cover_image TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建图片表
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      album_id TEXT,
      url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      location TEXT,
      date TEXT,
      star INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (album_id) REFERENCES albums(id)
    )
  `);

  // 创建 EXIF 数据表
  db.exec(`
    CREATE TABLE IF NOT EXISTS exif_data (
      image_id TEXT PRIMARY KEY,
      camera_model TEXT,
      lens_model TEXT,
      f_number REAL,
      exposure_time TEXT,
      iso INTEGER,
      focal_length TEXT,
      location TEXT,
      date_time TEXT,
      raw_data TEXT,
      latitude REAL,
      longitude REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (image_id) REFERENCES images(id)
    )
  `);

  // 检查 exif_data 表是否有经纬度字段，如果没有则添加
  try {
    const tableInfo = db.prepare("PRAGMA table_info(exif_data)").all();
    const hasLatitude = tableInfo.some((column: any) => column.name === 'latitude');
    const hasLongitude = tableInfo.some((column: any) => column.name === 'longitude');
    
    if (!hasLatitude) {
      db.exec(`ALTER TABLE exif_data ADD COLUMN latitude REAL`);
    }
    
    if (!hasLongitude) {
      db.exec(`ALTER TABLE exif_data ADD COLUMN longitude REAL`);
    }
  } catch (error) {
    console.error('检查或更新 exif_data 表结构时出错:', error);
  }

  // 创建更新记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 检查 updates 表是否有 status_code 字段，如果没有则添加
  try {
    const tableInfo = db.prepare("PRAGMA table_info(updates)").all();
    const hasStatusCode = tableInfo.some((column: any) => column.name === 'status_code');
    
    if (!hasStatusCode) {
      db.exec(`ALTER TABLE updates ADD COLUMN status_code TEXT`);
      
      // 更新现有记录的 status_code
      db.exec(`
        UPDATE updates SET status_code = 
          CASE 
            WHEN status = 'success' THEN 'success'
            WHEN status = 'warning' THEN 'warning'
            WHEN status = 'error' THEN 'error'
            ELSE 'info'
          END
      `);
    }
  } catch (error) {
    console.error('检查或更新 updates 表结构时出错:', error);
  }

  db.close();
}

// 记录更新操作
export function logUpdate(type: string, status: string, message?: string, statusCode?: string) {
  const db = getDb();
  
  // 如果没有提供 statusCode，则根据 status 设置
  if (!statusCode) {
    if (status === 'success') statusCode = 'success';
    else if (status === 'warning') statusCode = 'warning';
    else if (status === 'error') statusCode = 'error';
    else if (status === 'partial_success') statusCode = 'partial_success';
    else statusCode = 'info';
  }
    
    let stmt;
    if (hasStatusCode) {
      stmt = db.prepare(`
        INSERT INTO updates (type, status, message, status_code)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(type, status, message || null, statusCode);
    } else {
      stmt = db.prepare(`
        INSERT INTO updates (type, status, message)
        VALUES (?, ?, ?)
      `);
      stmt.run(type, status, message || null);
    }
    
    db.close();
    return { success: true };
}

// 定义数据库记录的类型
interface AlbumRecord {
  id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  date: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface ImageRecord {
  id: string;
  album_id: string;
  url: string;
  title: string | null;
  description: string | null;
  location: string | null;
  date: string | null;
  star: number;
  likes: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface ExifRecord {
  image_id: string;
  camera_model: string | null;
  lens_model: string | null;
  f_number: number | null;
  exposure_time: string | null;
  iso: number | null;
  focal_length: string | null;
  location: string | null;
  date_time: string | null;
  raw_data: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

// 定义更新记录的类型
interface UpdateRecord {
  id: number;
  type: string;
  status: string;
  message: string | null;
  created_at: string;
  status_code?: string;
}

// 定义数据库查询结果的类型
interface DbQueryResult {
  last_updated: string | null;
  [key: string]: any;
}

// 获取最后一次更新记录
export function getLastUpdate(type: string): UpdateRecord | null {
  const db = getDb();
  
  // 先检查表中是否有记录
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM updates
    WHERE type = ?
  `);
  
  const countResult = countStmt.get(type) as { count: number };
  
  if (countResult.count === 0) {
    db.close();
    return null;
  }
  
  // 获取最新的记录
  const stmt = db.prepare(`
    SELECT * FROM updates
    WHERE type = ?
    ORDER BY id DESC, created_at DESC
    LIMIT 1
  `);
  
  const result = stmt.get(type) as UpdateRecord | null;
  
  db.close();
  return result;
}

// 保存相册数据
export function saveAlbums(albums: Record<string, any>) {
  const db = getDb();
  
  let processedAlbums = 0;
  let processedImages = 0;
  let skippedImages = 0;
  
  try {
    // 开始事务
    db.prepare('BEGIN TRANSACTION').run();
    
    // 获取现有相册信息
    const getExistingAlbum = db.prepare('SELECT * FROM albums WHERE id = ?');
    
    // 插入或更新相册
    const insertAlbum = db.prepare(`
      INSERT OR REPLACE INTO albums (id, title, description, location, date, cover_image, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    // 获取现有图片信息
    const getExistingImage = db.prepare('SELECT * FROM images WHERE id = ?');
    
    // 插入或更新图片
    const insertImage = db.prepare(`
      INSERT OR REPLACE INTO images (id, album_id, url, title, location, date, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    // 更新图片的星级和点赞数
    const updateImageStarAndLikes = db.prepare(`
      UPDATE images SET star = ?, likes = ? WHERE id = ?
    `);
    
    // 处理每个相册
    for (const [albumId, albumData] of Object.entries(albums)) {
      // 获取现有相册信息
      const existingAlbum = getExistingAlbum.get(albumId) as AlbumRecord | null;
      
      // 插入相册，保留现有信息
      insertAlbum.run(
        albumId,
        albumData.title || (existingAlbum ? existingAlbum.title : null),
        albumData.description || (existingAlbum ? existingAlbum.description : null),
        albumData.location || (existingAlbum ? existingAlbum.location : null),
        albumData.date || (existingAlbum ? existingAlbum.date : null),
        albumData.images && albumData.images.length > 0 ? albumData.images[0] : (existingAlbum ? existingAlbum.cover_image : null)
      );
      
      processedAlbums++;
      
      // 处理相册中的图片
      if (albumData.images && Array.isArray(albumData.images)) {
        for (const imageUrl of albumData.images) {
          // 从 URL 生成图片 ID
          const imageId = `${albumId}/${path.basename(imageUrl)}`;
          
          // 获取现有图片信息
          const existingImage = getExistingImage.get(imageId) as ImageRecord | null;
          
          // 插入图片
          insertImage.run(
            imageId,
            albumId,
            imageUrl,
            albumData.title || null,
            albumData.location || null,
            albumData.date || null
          );
          
          // 如果存在现有数据，保留 star 和 likes
          if (existingImage) {
            updateImageStarAndLikes.run(
              existingImage.star || 0,
              existingImage.likes || 0,
              imageId
            );
          }
          
          processedImages++;
        }
      }
    }
    
    // 提交事务
    db.prepare('COMMIT').run();
    
    db.close();
    return { 
      success: true, 
      message: `相册数据已成功保存到数据库，处理了 ${processedAlbums} 个相册，${processedImages} 张图片`,
      status: 'success'
    };
  } catch (error) {
    // 回滚事务
    db.prepare('ROLLBACK').run();
    
    db.close();
    return { 
      success: false, 
      message: `保存相册数据时出错: ${error instanceof Error ? error.message : String(error)}`,
      status: 'error'
    };
  }
}

// 保存 EXIF 数据
export function saveExifData(exifData: Record<string, any>) {
  const db = getDb();
  
  let processedCount = 0;
  let skippedCount = 0;
  let insertedCount = 0;
  let existingCount = 0;
  
  try {
    // 基础验证检查
    if (!exifData || typeof exifData !== 'object' || Array.isArray(exifData)) {
      const errorMsg = !exifData ? 'EXIF 数据为空' : 
                      Array.isArray(exifData) ? 'EXIF 数据是数组，应该是对象' :
                      `EXIF 数据不是对象类型: ${typeof exifData}`;
      db.close();
      return { success: false, message: errorMsg, status: 'error' };
    }
    
    const keys = Object.keys(exifData);
    if (keys.length === 0) {
      db.close();
      return { success: true, message: 'EXIF 数据为空，没有数据需要处理', status: 'warning' };
    }
    
    // 开始事务
    db.prepare('BEGIN TRANSACTION').run();
    
    // 准备语句
    const checkImageStmt = db.prepare('SELECT id FROM images WHERE id = ?');
    const checkExistingExifStmt = db.prepare('SELECT image_id FROM exif_data WHERE image_id = ?');
    const insertExifStmt = db.prepare(`
      INSERT INTO exif_data (
        image_id, camera_model, lens_model, f_number, exposure_time, 
        iso, focal_length, location, date_time, raw_data, latitude, longitude, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    // 处理每个 EXIF 数据项
    for (const [imageId, data] of Object.entries(exifData)) {
      try {
        if (!imageId || !data || typeof data !== 'object') {
          skippedCount++;
          continue;
        }
        
        // 转换文件扩展名为 .webp
        const newId = imageId.replace(/\.(jpeg|jpg|JPG|JPEG)$/i, '.webp');
        
        // 检查图片是否存在
        const image = checkImageStmt.get(newId);
        if (!image) {
          skippedCount++;
          continue;
        }
        
        // 检查是否已存在 EXIF 数据
        const existingExif = checkExistingExifStmt.get(newId);
        if (existingExif) {
          existingCount++;
          continue;
        }
        
        // 解析数据
        const finalData = {
          camera_model: data.CameraModel || null,
          lens_model: data.LensModel || null,
          f_number: parseFloat(data.FNumber) || null,
          exposure_time: data.ExposureTime || null,
          iso: parseInt(data.ISO) || null,
          focal_length: data.FocalLength || null,
          location: data.Location || null,
          date_time: data.DateTime || null,
          latitude: parseFloat(data.GPSLatitude) || 
                   parseFloat(data.latitude) || 
                   parseFloat(data.Latitude) || null,
          longitude: parseFloat(data.GPSLongitude) || 
                    parseFloat(data.longitude) || 
                    parseFloat(data.Longitude) || null
        };
        
        // 保存原始数据
        const rawData = JSON.stringify({
          ...data,
          _lastUpdate: new Date().toISOString()
        });
        
        // 插入新数据
        insertExifStmt.run(
          newId,
          finalData.camera_model,
          finalData.lens_model,
          finalData.f_number,
          finalData.exposure_time,
          finalData.iso,
          finalData.focal_length,
          finalData.location,
          finalData.date_time,
          rawData,
          finalData.latitude,
          finalData.longitude
        );
        
        insertedCount++;
        processedCount++;
      } catch (itemError) {
        skippedCount++;
      }
    }
    
    // 提交事务
    db.prepare('COMMIT').run();
    
    const summary = `处理了 ${processedCount} 条 EXIF 数据，` +
                   `插入了 ${insertedCount} 条新数据，` +
                   `跳过了 ${existingCount} 条已存在数据，` +
                   `跳过了 ${skippedCount} 条无效数据`;
    
    db.close();
    
    // 返回结果
    if (processedCount === 0 && skippedCount > 0) {
      return { 
        success: true, 
        message: `未找到匹配的图片，所有 EXIF 数据（${skippedCount} 条）都被跳过`,
        status: 'warning'
      };
    }
    
    return { 
      success: true, 
      message: summary,
      status: 'success',
      details: {
        processed: processedCount,
        inserted: insertedCount,
        existing: existingCount,
        skipped: skippedCount
      }
    };
    
  } catch (error) {
    // 回滚事务
    try {
      db.prepare('ROLLBACK').run();
    } catch (rollbackError) {
      console.error('回滚事务时出错:', rollbackError);
    }
    
    console.error('保存 EXIF 数据时出错:', error);
    
    db.close();
    return { 
      success: false, 
      message: `保存 EXIF 数据时出错: ${error instanceof Error ? error.message : String(error)}`,
      status: 'error'
    };
  }
}

// 获取所有相册
export function getAlbums() {
  const db = getDb();
  const albums = db.prepare('SELECT * FROM albums ORDER BY date DESC').all();
  db.close();
  return albums;
}

// 获取相册详情（包含图片）
export function getAlbumWithImages(albumId: string) {
  const db = getDb();
  
  // 获取相册基本信息
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(albumId) as AlbumRecord | null;
  
  if (album) {
    // 获取相册中的图片
    const images = db.prepare('SELECT * FROM images WHERE album_id = ?').all(albumId) as ImageRecord[];
    
    // 将图片添加到相册对象中
    album.images = images;
  }
  
  db.close();
  return album;
}

// 获取所有图片（可选择带 EXIF 数据）
export function getAllImages(withExif = false) {
  const db = getDb();
  
  let query = `
    SELECT i.*, a.title as album_title, a.location as album_location
    FROM images i
    LEFT JOIN albums a ON i.album_id = a.id
  `;
  
  const images = db.prepare(query).all() as ImageRecord[];
  
  if (withExif) {
    const exifStmt = db.prepare('SELECT * FROM exif_data WHERE image_id = ?');
    
    for (const image of images) {
      const exif = exifStmt.get(image.id) as ExifRecord | null;
      if (exif) {
        image.exif = exif;
        // 解析原始 EXIF 数据
        if (exif.raw_data) {
          try {
            image.exif.raw = JSON.parse(exif.raw_data);
          } catch (e) {
            console.error('解析 EXIF 原始数据失败:', e);
          }
        }
      }
    }
  }
  
  db.close();
  return images;
}

// 更新图片星级
export function updateImageStar(imageId: string, star: number) {
  const db = getDb();
  const result = db.prepare('UPDATE images SET star = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(star, imageId);
  db.close();
  return result.changes > 0;
}

// 更新图片点赞数
export function updateImageLikes(imageId: string, likes: number) {
  const db = getDb();
  const result = db.prepare('UPDATE images SET likes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(likes, imageId);
  db.close();
  return result.changes > 0;
}

// 获取最后更新时间
export function getLastUpdatedTime() {
  const db = getDb();
  
  const albumsUpdate = db.prepare(`
    SELECT MAX(updated_at) as last_updated FROM albums
  `).get() as DbQueryResult;
  
  const exifUpdate = db.prepare(`
    SELECT MAX(updated_at) as last_updated FROM exif_data
  `).get() as DbQueryResult;
  
  db.close();
  
  // 转换为北京时间格式
  const formatToBeijingTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    
    try {
      // 创建日期对象
      const date = new Date(timeStr);
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('无效的日期字符串:', timeStr);
        return timeStr;
      }
      
      // 使用 toLocaleString 转换为北京时间格式
      return date.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      console.error('格式化日期时出错:', e);
      return timeStr;
    }
  };
  
  return {
    albums: formatToBeijingTime(albumsUpdate?.last_updated || null),
    exif: formatToBeijingTime(exifUpdate?.last_updated || null)
  };
}

// 获取带地理位置的照片
export function getPhotosWithLocation() {
  initDb();
  
  // 从数据库获取所有图片，包含EXIF数据
  const images = getAllImages(true);
  
  // 过滤出有经纬度信息的图片
  const geotaggedImages = images.filter(image => {
    // 检查是否有EXIF数据
    if (!image.exif || !image.exif.raw_data) {
      return false;
    }
    
    // 尝试解析原始EXIF数据
    let rawExif = null;
    try {
      if (typeof image.exif.raw_data === 'string') {
        rawExif = JSON.parse(image.exif.raw_data);
      }
    } catch (e) {
      console.error(`解析图片 ${image.id} 的EXIF数据失败:`, e);
      return false;
    }
    
    // 检查是否有GPS坐标
    return rawExif && 
      ((rawExif.Latitude !== undefined && rawExif.Longitude !== undefined) || 
      (rawExif.GPSLatitude !== undefined && rawExif.GPSLongitude !== undefined));
  });
  
  // 转换为前端需要的格式
  const mapData = geotaggedImages.map(image => {
    // 解析原始EXIF数据
    let rawExif = {};
    try {
      if (image.exif?.raw_data && typeof image.exif.raw_data === 'string') {
        rawExif = JSON.parse(image.exif.raw_data);
      }
    } catch (e) {
      console.error(`解析图片 ${image.id} 的EXIF数据失败:`, e);
    }
    
    // 从原始EXIF数据中提取经纬度
    const latitude = rawExif.Latitude || rawExif.GPSLatitude || 0;
    const longitude = rawExif.Longitude || rawExif.GPSLongitude || 0;
    
    return {
      id: image.id,
      url: image.url,
      title: image.album_title || '未知相册',
      location: image.exif?.location || '未知地点',
      latitude: latitude,
      longitude: longitude,
      date: image.exif?.date_time || '未知时间',
      cameraModel: image.exif?.camera_model || '未知相机',
      exif: {
        FNumber: image.exif?.f_number,
        ISO: image.exif?.iso,
        FocalLength: image.exif?.focal_length,
        ExposureTime: image.exif?.exposure_time,
        LensModel: image.exif?.lens_model,
      }
    };
  });
  
  return mapData;
}

// 初始化数据库
initDb(); 
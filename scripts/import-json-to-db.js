/**
 * 从 JSON 文件导入数据到 SQLite 数据库
 * 用法: node scripts/import-json-to-db.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 配置
const DB_PATH = path.join(process.cwd(), 'data', 'gallery.db');
const ALBUMS_JSON_PATH = path.join(process.cwd(), 'public', 'data', 'albums.json');
const EXIF_JSON_PATH = path.join(process.cwd(), 'public', 'data', 'exif_data.json');
const LIKES_JSON_PATH = path.join(process.cwd(), 'public', 'data', 'likes.json');

// 确保数据库目录存在
function ensureDbDirExists() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// 初始化数据库
function initDb() {
  ensureDbDirExists();
  const db = new Database(DB_PATH);

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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (image_id) REFERENCES images(id)
    )
  `);

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

  return db;
}

// 导入相册数据
function importAlbums(db, albumsData) {
  console.log('导入相册数据...');
  
  // 开始事务
  const transaction = db.transaction(() => {
    // 准备语句
    const insertAlbum = db.prepare(`
      INSERT OR REPLACE INTO albums (id, title, description, location, date, cover_image)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const insertImage = db.prepare(`
      INSERT OR REPLACE INTO images (id, album_id, url, title, location, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // 处理每个相册
    for (const [albumId, albumData] of Object.entries(albumsData)) {
      console.log(`处理相册: ${albumId}`);
      
      // 插入相册
      insertAlbum.run(
        albumId,
        albumData.title || null,
        albumData.description || null,
        albumData.location || null,
        albumData.date || null,
        albumData.images && albumData.images.length > 0 ? albumData.images[0] : null
      );
      
      // 处理相册中的图片
      if (albumData.images && Array.isArray(albumData.images)) {
        for (const imageUrl of albumData.images) {
          // 从 URL 提取文件名
          const fileName = path.basename(imageUrl);
          
          // 生成图片 ID (与 EXIF 数据中的 ID 匹配)
          const imageId = `${albumId}/${fileName}`;
          
          console.log(`  添加图片: ${imageId}`);
          
          // 插入图片
          insertImage.run(
            imageId,
            albumId,
            imageUrl,
            albumData.title || null,
            albumData.location || null,
            albumData.date || null
          );
        }
      }
    }
  });
  
  // 执行事务
  transaction();
  console.log('相册数据导入完成');
}

// 导入 EXIF 数据
function importExifData(db, exifData) {
  console.log('导入 EXIF 数据...');
  
  let processedCount = 0;
  let skippedCount = 0;
  
  try {
    // 开始事务
    db.prepare('BEGIN TRANSACTION').run();
    
    const checkImageStmt = db.prepare('SELECT id FROM images WHERE id = ?');
    const insertExifStmt = db.prepare(`
      INSERT INTO exif_data (
        image_id, camera_model, lens_model, f_number, exposure_time, 
        iso, focal_length, location, date_time, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const [imageId, data] of Object.entries(exifData)) {
      // 将文件扩展名转换为 .webp 以匹配数据库中的图片 ID
      const originalId = imageId;
      const newId = originalId.replace(/\.(jpeg|jpg|JPG|JPEG)$/i, '.webp');
      
      // 检查图片是否存在
      const image = checkImageStmt.get(newId);
      
      if (image) {
        // 将完整数据序列化为 JSON
        const rawData = JSON.stringify(data);
        
        insertExifStmt.run(
          newId,
          data.CameraModel || null,
          data.LensModel || null,
          data.FNumber || null,
          data.ExposureTime || null,
          data.ISO || null,
          data.FocalLength || null,
          data.Location || null,
          data.DateTime || null,
          rawData
        );
        processedCount++;
        console.log(`  添加 EXIF 数据: ${newId}`);
      } else {
        console.log(`跳过 EXIF 数据: ${originalId} (图片不存在，转换后ID: ${newId})`);
        skippedCount++;
      }
    }
    
    // 提交事务
    db.prepare('COMMIT').run();
    console.log(`处理了 ${processedCount} 条 EXIF 数据，跳过了 ${skippedCount} 条`);
  } catch (error) {
    // 回滚事务
    db.prepare('ROLLBACK').run();
    console.error('导入 EXIF 数据时出错:', error);
  }
  
  console.log('EXIF 数据导入完成');
}

// 导入点赞数据
function importLikesData(db, likesData) {
  console.log('导入点赞数据...');
  
  let processedCount = 0;
  let skippedCount = 0;
  
  try {
    // 开始事务
    db.prepare('BEGIN TRANSACTION').run();
    
    const checkImageStmt = db.prepare('SELECT id FROM images WHERE id = ?');
    const updateLikesStmt = db.prepare('UPDATE images SET likes = ? WHERE id = ?');
    
    for (const [imageId, likes] of Object.entries(likesData)) {
      // 将文件扩展名转换为 .webp 以匹配数据库中的图片 ID
      const originalId = imageId;
      const newId = originalId.replace(/\.(jpeg|jpg|JPG|JPEG)$/i, '.webp');
      
      // 检查图片是否存在
      const image = checkImageStmt.get(newId);
      
      if (image) {
        updateLikesStmt.run(likes, newId);
        processedCount++;
        console.log(`  更新点赞数据: ${newId} (${likes} 个赞)`);
      } else {
        console.log(`跳过点赞数据: ${originalId} (图片不存在，转换后ID: ${newId})`);
        skippedCount++;
      }
    }
    
    // 提交事务
    db.prepare('COMMIT').run();
    console.log(`处理了 ${processedCount} 条点赞数据，跳过了 ${skippedCount} 条`);
  } catch (error) {
    // 回滚事务
    db.prepare('ROLLBACK').run();
    console.error('导入点赞数据时出错:', error);
  }
  
  console.log('点赞数据导入完成');
}

// 导入星级数据
function importStarData(db, exifData) {
  console.log('导入星级数据...');
  
  let processedCount = 0;
  let skippedCount = 0;
  
  try {
    // 开始事务
    db.prepare('BEGIN TRANSACTION').run();
    
    const checkImageStmt = db.prepare('SELECT id FROM images WHERE id = ?');
    const updateStarStmt = db.prepare('UPDATE images SET star = ? WHERE id = ?');
    
    for (const [imageId, data] of Object.entries(exifData)) {
      if (data.star !== undefined) {
        // 将文件扩展名转换为 .webp 以匹配数据库中的图片 ID
        const originalId = imageId;
        const newId = originalId.replace(/\.(jpeg|jpg|JPG|JPEG)$/i, '.webp');
        
        // 检查图片是否存在
        const image = checkImageStmt.get(newId);
        
        if (image) {
          updateStarStmt.run(data.star, newId);
          processedCount++;
          console.log(`  更新星级数据: ${newId} (${data.star} 星)`);
        } else {
          console.log(`跳过星级数据: ${originalId} (图片不存在，转换后ID: ${newId})`);
          skippedCount++;
        }
      }
    }
    
    // 提交事务
    db.prepare('COMMIT').run();
    console.log(`处理了 ${processedCount} 条星级数据，跳过了 ${skippedCount} 条`);
  } catch (error) {
    // 回滚事务
    db.prepare('ROLLBACK').run();
    console.error('导入星级数据时出错:', error);
  }
  
  console.log('星级数据导入完成');
}

// 主函数
async function main() {
  try {
    // 初始化数据库
    const db = initDb();
    console.log('数据库初始化完成');
    
    // 读取 JSON 文件
    let albumsData = {};
    let exifData = {};
    let likesData = {};
    
    if (fs.existsSync(ALBUMS_JSON_PATH)) {
      albumsData = JSON.parse(fs.readFileSync(ALBUMS_JSON_PATH, 'utf8'));
      console.log(`读取到 ${Object.keys(albumsData).length} 个相册`);
    } else {
      console.warn('相册数据文件不存在');
    }
    
    if (fs.existsSync(EXIF_JSON_PATH)) {
      exifData = JSON.parse(fs.readFileSync(EXIF_JSON_PATH, 'utf8'));
      console.log(`读取到 ${Object.keys(exifData).length} 条 EXIF 数据`);
    } else {
      console.warn('EXIF 数据文件不存在');
    }
    
    if (fs.existsSync(LIKES_JSON_PATH)) {
      likesData = JSON.parse(fs.readFileSync(LIKES_JSON_PATH, 'utf8'));
      console.log(`读取到 ${Object.keys(likesData).length} 条点赞数据`);
    } else {
      console.warn('点赞数据文件不存在');
    }
    
    // 导入数据
    importAlbums(db, albumsData);
    importExifData(db, exifData);
    importLikesData(db, likesData);
    importStarData(db, exifData);
    
    // 记录导入操作
    const logUpdate = db.prepare(`
      INSERT INTO updates (type, status, message)
      VALUES (?, ?, ?)
    `);
    
    logUpdate.run('import', 'success', '从 JSON 文件导入数据成功');
    
    // 关闭数据库
    db.close();
    console.log('数据导入完成');
  } catch (error) {
    console.error('导入数据失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main(); 
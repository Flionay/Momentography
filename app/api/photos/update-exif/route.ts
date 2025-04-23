import { NextResponse } from 'next/server';
import { getDb, logUpdate } from '@/app/utils/dbUtils';

// 定义EXIF数据接口
interface ExifData {
  camera_model?: string | null;
  lens_model?: string | null;
  f_number?: number | null;
  exposure_time?: string | null;
  iso?: number | null;
  focal_length?: string | null;
  location?: string | null;
  date_time?: string | null;
  raw_data?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function POST(request: Request) {
  try {
    const { photoId, exifData } = await request.json();
    
    // 验证必要的参数
    if (!photoId) {
      return NextResponse.json({ success: false, message: '缺少照片ID' }, { status: 400 });
    }
    
    if (!exifData || typeof exifData !== 'object') {
      return NextResponse.json({ success: false, message: '缺少EXIF数据或格式不正确' }, { status: 400 });
    }
    
    const db = getDb();
    
    try {
      // 检查图片是否存在
      const image = db.prepare('SELECT id FROM images WHERE id = ?').get(photoId);
      
      if (!image) {
        db.close();
        return NextResponse.json({ success: false, message: '照片不存在' }, { status: 404 });
      }
      
      // 获取现有的EXIF数据
      const existingExif = db.prepare('SELECT * FROM exif_data WHERE image_id = ?').get(photoId) as ExifData | undefined || {};
      
      // 合并现有数据和新数据
      const updatedData = {
        ...existingExif,
        ...exifData,
      };
      
      // 将完整数据序列化为JSON
      const rawData = JSON.stringify(updatedData);
      
      // 更新EXIF数据
      const updateStmt = db.prepare(`
        INSERT OR REPLACE INTO exif_data (
          image_id, camera_model, lens_model, f_number, exposure_time, 
          iso, focal_length, location, date_time, raw_data, latitude, longitude, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      updateStmt.run(
        photoId,
        exifData.camera_model || null,
        exifData.lens_model || null,
        exifData.f_number || null,
        exifData.exposure_time || null,
        exifData.iso || null,
        exifData.focal_length || null,
        exifData.location || null,
        exifData.date_time || null,
        rawData,
        exifData.latitude || null,
        exifData.longitude || null
      );
      
      // 记录更新操作
      logUpdate('exif', 'success', `已更新照片 ${photoId} 的EXIF数据`);
      
      db.close();
      return NextResponse.json({ 
        success: true, 
        message: '照片EXIF数据已更新' 
      });
    } catch (error) {
      db.close();
      return NextResponse.json({ 
        success: false, 
        message: `更新EXIF数据时出错: ${error instanceof Error ? error.message : String(error)}` 
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: `处理请求时出错: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 
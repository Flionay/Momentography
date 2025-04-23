import { NextRequest, NextResponse } from 'next/server';
import { getAllImages } from '@/app/utils/dbUtils';

export async function GET(request: NextRequest) {
  try {
    // 从数据库获取所有图片，包含EXIF数据
    const images = getAllImages(true);
    
    // 转换为前端需要的格式（与原来的JSON格式兼容）
    const exifData: Record<string, any> = {};
    
    for (const image of images) {
      if (image.exif) {
        // 使用图片ID作为键
        exifData[image.id] = {
          CameraModel: image.exif.camera_model,
          LensModel: image.exif.lens_model,
          FNumber: image.exif.f_number,
          ExposureTime: image.exif.exposure_time,
          ISO: image.exif.iso,
          FocalLength: image.exif.focal_length,
          Location: image.exif.location,
          DateTime: image.exif.date_time,
          // 如果有原始数据，也包含进来
          ...(image.exif.raw || {})
        };
      }
    }
    
    // 创建响应对象
    const response = NextResponse.json(exifData);
    
    // 添加 Cache-Control 头部，防止浏览器缓存
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;
  } catch (error) {
    const errorResponse = NextResponse.json(
      { error: '获取EXIF数据失败', message: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
    
    // 同样为错误响应添加 Cache-Control 头部
    errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    errorResponse.headers.set('Surrogate-Control', 'no-store');
    
    return errorResponse;
  }
} 
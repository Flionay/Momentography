import { NextRequest, NextResponse } from 'next/server';
import { getAllImages } from '@/app/utils/dbUtils';

export async function GET(request: NextRequest) {
  try {
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
    
    console.log(`找到 ${geotaggedImages.length} 张带地理位置的图片，总共 ${images.length} 张图片`);
    
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
      
      console.log(`图片 ${image.id} 的坐标: ${latitude}, ${longitude}`);
      
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
    
    // 创建响应对象
    const response = NextResponse.json(mapData);
    
    // 添加 Cache-Control 头部，防止浏览器缓存
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;
  } catch (error) {
    console.error('获取地图数据失败:', error);
    
    const errorResponse = NextResponse.json(
      { error: '获取地图数据失败', message: error instanceof Error ? error.message : '未知错误' },
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
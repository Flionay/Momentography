import { NextRequest, NextResponse } from 'next/server';
import { getAlbums, getAlbumWithImages } from '@/app/utils/dbUtils';

export async function GET(request: NextRequest) {
  try {
    // 从数据库获取所有相册
    const albums = getAlbums();
    
    // 转换为前端需要的格式（与原来的JSON格式兼容）
    const albumsData: Record<string, any> = {};
    
    for (const album of albums) {
      // 获取相册中的图片
      const albumWithImages = getAlbumWithImages(album.id);
      const images = albumWithImages?.images || [];
      
      // 添加到结果对象
      albumsData[album.id] = {
        title: album.title,
        desc: album.description,
        location: album.location,
        date: album.date,
        images: images.map((image: any) => image.url)
      };
    }
    
    // 创建响应对象
    const response = NextResponse.json(albumsData);
    
    // 添加 Cache-Control 头部，防止浏览器缓存
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;
  } catch (error) {
    console.error('获取相册数据失败:', error);
    
    const errorResponse = NextResponse.json(
      { error: '获取相册数据失败', message: error instanceof Error ? error.message : '未知错误' },
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
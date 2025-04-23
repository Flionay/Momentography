import { NextRequest, NextResponse } from 'next/server';
import { getAlbumWithImages } from '@/app/utils/dbUtils';

export async function GET(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const params = await segmentData.params;
    const albumId = params.id;
    
    // 从数据库获取相册详情
    const album = getAlbumWithImages(albumId);
    
    if (!album) {
      return NextResponse.json(
        { error: '相册不存在', message: `未找到ID为 ${albumId} 的相册` },
        { status: 404 }
      );
    }
    
    // 转换为前端需要的格式
    const albumData = {
      id: album.id,
      title: album.title,
      desc: album.description,
      location: album.location,
      date: album.date,
      images: album.images.map((image: any) => image.url)
    };
    
    // 创建响应对象
    const response = NextResponse.json(albumData);
    
    // 添加 Cache-Control 头部，防止浏览器缓存
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;
  } catch (error) {
    const errorResponse = NextResponse.json(
      { error: '获取相册详情失败', message: error instanceof Error ? error.message : '未知错误' },
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
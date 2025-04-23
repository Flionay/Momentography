import { NextRequest, NextResponse } from 'next/server';
import { getAllImages } from '@/app/utils/dbUtils';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const withExif = searchParams.get('withExif') === 'true';
    
    // 从数据库获取所有照片
    const photos = getAllImages(withExif);
    
    return NextResponse.json({
      success: true,
      photos
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '获取照片列表失败' },
      { status: 500 }
    );
  }
} 
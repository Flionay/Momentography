import { NextRequest, NextResponse } from 'next/server';
import { updateImageStar } from '@/app/utils/dbUtils';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const { photoId, star } = body;
    
    // 验证参数
    if (!photoId || typeof star !== 'number' || star < 0 || star > 5) {
      return NextResponse.json(
        { success: false, error: '无效的参数' },
        { status: 400 }
      );
    }
    
    // 更新星级
    const success = updateImageStar(photoId, star);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '星级更新成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '照片不存在或更新失败' },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '更新星级失败' },
      { status: 500 }
    );
  }
} 
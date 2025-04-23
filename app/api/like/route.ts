import { NextRequest, NextResponse } from 'next/server';
import { updateImageLikes } from '@/app/utils/dbUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoId, likes } = body;
    
    if (!photoId || typeof likes !== 'number' || likes < 0) {
      return NextResponse.json(
        { success: false, message: '无效的参数' },
        { status: 400 }
      );
    }
    
    // 更新数据库中的点赞数
    const success = updateImageLikes(photoId, likes);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '点赞数更新成功'
      });
    } else {
      return NextResponse.json(
        { success: false, message: '照片不存在或更新失败' },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getLastUpdatedTime, getLastUpdate } from '@/app/utils/dbUtils';

// 定义更新记录的类型
interface UpdateRecord {
  id: number;
  type: string;
  status: string;
  message: string | null;
  created_at: string;
  status_code?: string;
}

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数中的文件名
    const searchParams = request.nextUrl.searchParams;
    const fileType = searchParams.get('type') || 'albums';
    
    // 获取数据库中的最后更新时间
    const lastUpdated = getLastUpdatedTime();
    
    // 获取最后一次更新记录
    const lastUpdateRecord = getLastUpdate(fileType) as UpdateRecord | null;
    
    // 确保返回的时间是有效的
    const lastModifiedTime = fileType === 'exif' ? lastUpdated.exif : lastUpdated.albums;
    
    // 处理状态字段
    if (lastUpdateRecord) {
      // 如果没有 status_code 字段，使用 status 字段作为状态码
      if (!lastUpdateRecord.status_code) {
        if (lastUpdateRecord.status === 'success') {
          lastUpdateRecord.status_code = 'success';
        } else if (lastUpdateRecord.status === 'warning') {
          lastUpdateRecord.status_code = 'warning';
        } else if (lastUpdateRecord.status === 'error') {
          lastUpdateRecord.status_code = 'error';
        } else if (lastUpdateRecord.status === 'partial_success') {
          lastUpdateRecord.status_code = 'partial_success';
        } else {
          lastUpdateRecord.status_code = 'info';
        }
      }
      
      // 为前端提供一个统一的 status 字段
      // 确保 status 字段与 status_code 一致
      lastUpdateRecord.status = lastUpdateRecord.status_code;
    }
    
    // 创建响应对象
    const response = NextResponse.json({
      type: fileType,
      lastModified: lastModifiedTime,
      lastUpdate: lastUpdateRecord,
      success: true
    });
    
    // 添加 Cache-Control 头部，防止浏览器缓存
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    const errorResponse = NextResponse.json(
      { error: '获取更新信息失败', message: errorMessage, success: false, status: 'error' },
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
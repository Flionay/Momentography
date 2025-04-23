import { NextRequest, NextResponse } from 'next/server';
import { updateAlbumsJsonData } from '@/app/utils/ossUtils';
import { OSS_CONFIG } from '@/app/config/oss';
import { logUpdate } from '@/app/utils/dbUtils';

// 验证 webhook 请求
function verifyWebhook(request: NextRequest): boolean {
  // 获取请求头中的密钥
  const authHeader = request.headers.get('x-webhook-secret');
  
  // 验证密钥是否匹配
  return authHeader === OSS_CONFIG.WEBHOOK_SECRET;
}

export async function POST(request: NextRequest) {
  try {
    // 验证 webhook 请求
    if (!verifyWebhook(request)) {
      logUpdate('webhook', 'error', '未授权的请求');
      return NextResponse.json(
        { success: false, message: '未授权的请求', status: 'error' },
        { status: 401 }
      );
    }
    
    // 记录 webhook 触发
    logUpdate('webhook', 'info', 'Webhook 触发，开始更新数据');
    
    // 更新相册数据
    const result = await updateAlbumsJsonData();
    
    if (result.success) {
      // 根据状态字段确定日志类型
      const logStatus = result.status === 'partial_success' ? 'warning' : 'success';
      logUpdate('webhook', logStatus, `通过 Webhook ${result.status === 'partial_success' ? '部分' : ''}成功更新数据`);
      
      return NextResponse.json(
        { success: true, message: result.message, status: result.status },
        { status: 200 }
      );
    } else {
      logUpdate('webhook', 'error', `通过 Webhook 更新数据失败: ${result.message}`);
      return NextResponse.json(
        { success: false, message: result.message, status: result.status || 'error' },
        { status: 500 }
      );
    }
  } catch (error) {
    logUpdate('webhook', 'error', `Webhook 处理错误: ${error instanceof Error ? error.message : '未知错误'}`);
    return NextResponse.json(
      { success: false, message: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}`, status: 'error' },
      { status: 500 }
    );
  }
}

// 添加 GET 方法用于测试端点是否正常工作
export async function GET() {
  logUpdate('webhook', 'info', 'Webhook 端点测试');
  return NextResponse.json(
    { success: true, message: 'Webhook 端点正常工作', status: 'success' },
    { status: 200 }
  );
} 
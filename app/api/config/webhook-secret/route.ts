import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 从环境变量中获取Webhook密钥
  const webhookSecret = process.env.WEBHOOK_SECRET || 'update_momentography';
  
  // 创建响应对象
  const response = NextResponse.json({
    webhookSecret
  });
  
  // 添加 Cache-Control 头部，防止浏览器缓存
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');
  
  return response;
} 
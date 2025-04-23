import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { OSS_CONFIG } from '@/app/config/oss';

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), OSS_CONFIG.DB_PATH);

export async function GET() {
  try {
    // 检查数据库文件是否存在
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json(
        { error: '数据库文件不存在' },
        { status: 404 }
      );
    }

    // 读取数据库文件
    const dbFile = fs.readFileSync(DB_PATH);
    
    // 创建文件名（使用当前时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gallery-backup-${timestamp}.db`;
    
    // 返回数据库文件作为下载
    return new NextResponse(dbFile, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error('备份数据库时出错:', error);
    return NextResponse.json(
      { error: '备份数据库时出错' },
      { status: 500 }
    );
  }
} 
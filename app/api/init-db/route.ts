import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/app/utils/dbUtils';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // 初始化数据库
    initDb();
    
    // 检查数据库目录是否存在
    const dbDir = path.join(process.cwd(), 'data');
    const dbExists = fs.existsSync(path.join(dbDir, 'gallery.db'));
    
    return NextResponse.json({
      success: true,
      message: '数据库初始化成功',
      dbExists
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '数据库初始化失败' },
      { status: 500 }
    );
  }
} 
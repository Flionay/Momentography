import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { photoId, likes } = await request.json();
    
    // 点赞数据文件路径
    const dataFilePath = path.join(process.cwd(), 'public', 'data', 'likes.json');
    
    // 读取现有数据
    let likesData = {};
    try {
      if (fs.existsSync(dataFilePath)) {
        const fileContent = fs.readFileSync(dataFilePath, 'utf8');
        likesData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('读取点赞数据失败:', error);
    }
    
    // 更新数据
    likesData[photoId] = likes;
    
    // 写入文件
    fs.writeFileSync(dataFilePath, JSON.stringify(likesData, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存点赞数据失败:', error);
    return NextResponse.json({ success: false, error: 'Failed to save like data' }, { status: 500 });
  }
} 
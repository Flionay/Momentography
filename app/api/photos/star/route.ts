import { cookies } from 'next/headers';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  // 验证管理员身份
  const cookieStore = await cookies();
  if (cookieStore.get('admin-auth')?.value !== 'true') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const { photoPath, stars } = await request.json();
  
  try {
    // 读取现有的 EXIF 数据
    const exifPath = path.join(process.cwd(), 'public/data/exif_data.json');
    const exifData = JSON.parse(await fs.readFile(exifPath, 'utf8'));
    
    // 更新星级
    if (exifData[photoPath]) {
      exifData[photoPath].star = stars;
      
      // 写回文件
      await fs.writeFile(exifPath, JSON.stringify(exifData, null, 2));
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
      });
    }
    
    return new Response(JSON.stringify({ error: 'Photo not found' }), {
      status: 404,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update stars' }), {
      status: 500,
    });
  }
} 
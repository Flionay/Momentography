import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { password } = await request.json();
  
  // 这里使用一个简单的密码验证，实际应用中应该使用更安全的方式
  if (password === process.env.ADMIN_PASSWORD) {
    // 修复：await cookies 操作
    const cookieStore = cookies();
    await cookieStore.set('admin-auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 小时
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  }
  
  return new Response(JSON.stringify({ error: 'Invalid password' }), {
    status: 401,
  });
} 
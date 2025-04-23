import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { password } = await request.json();
  
  // 这里使用一个简单的密码验证，实际应用中应该使用更安全的方式
  if (password === process.env.ADMIN_PASSWORD) {
    // 创建一个新的响应对象，并在响应中设置cookie
    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
    
    // 设置cookie
    response.headers.append('Set-Cookie', `admin-auth=true; HttpOnly; Path=/; SameSite=Strict; Max-Age=${60 * 60 * 24}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`);
    
    return response;
  }
  
  return new Response(JSON.stringify({ error: 'Invalid password' }), {
    status: 401,
  });
} 
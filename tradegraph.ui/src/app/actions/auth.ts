'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) return { error: 'Username and password required' };

  try {
    const res = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      // Adding brief timeout to prevent long hangs if Gateway is down
      signal: AbortSignal.timeout(3000)
    });

    if (!res.ok) {
      if (res.status === 401) return { error: 'Invalid username or password' };
      return { error: 'Failed to communicate with authentication server' };
    }

    const { token } = await res.json();
    
    // Set secure cookie accessible to client script (so api.ts can attach as Bearer)
    (await cookies()).set('auth_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

  } catch (err) {
    return { error: 'API Gateway is unreachable' };
  }

  redirect('/');
}

export async function logout() {
  (await cookies()).delete('auth_token');
  redirect('/login');
}

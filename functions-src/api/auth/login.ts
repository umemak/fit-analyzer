interface Env {
  DB: D1Database;
  APP_URL: string;
}

function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const computedHash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  
  return computedHash === hashHex;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  try {
    const body = await context.request.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'メールアドレスとパスワードは必須です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await context.env.DB.prepare(
      `SELECT id, email, name, avatar_url, password_hash, provider 
       FROM users WHERE email = ? AND provider = 'email'`
    ).bind(email).first() as { 
      id: string; 
      email: string; 
      name: string; 
      avatar_url: string | null; 
      password_hash: string; 
      provider: string 
    } | null;

    if (!user || !user.password_hash) {
      return new Response(
        JSON.stringify({ error: 'メールアドレスまたはパスワードが正しくありません' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'メールアドレスまたはパスワードが正しくありません' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    await context.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, user.id, expiresAt).run();

    const isSecure = url.protocol === 'https:';
    const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${isSecure ? '; Secure' : ''}`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          avatar_url: user.avatar_url, 
          provider: 'email' 
        } 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${sessionId}; ${cookieOptions}`
        } 
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'ログインに失敗しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  APP_URL: string;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const appUrl = context.env.APP_URL || url.origin;

  if (!code) {
    const state = generateState();
    const redirectUri = `${appUrl}/api/auth/google`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${context.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline&state=${state}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': googleAuthUrl,
        'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${url.protocol === 'https:' ? '; Secure' : ''}`,
      },
    });
  }

  const storedState = getCookieValue(context.request.headers.get('Cookie'), 'oauth_state');
  if (!stateParam || stateParam !== storedState) {
    return Response.redirect(`${appUrl}/?error=invalid_state`, 302);
  }

  try {
    const redirectUri = `${appUrl}/api/auth/google`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: context.env.GOOGLE_CLIENT_ID,
        client_secret: context.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };

    if (tokenData.error || !tokenData.access_token) {
      return Response.redirect(`${appUrl}/?error=auth_failed`, 302);
    }

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userResponse.json() as GoogleUser;

    let user = await context.env.DB.prepare(
      'SELECT * FROM users WHERE provider = ? AND provider_id = ?'
    ).bind('google', googleUser.id).first();

    if (!user) {
      const userId = generateId();
      await context.env.DB.prepare(
        'INSERT INTO users (id, email, name, avatar_url, provider, provider_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(userId, googleUser.email, googleUser.name, googleUser.picture, 'google', googleUser.id).run();
      
      user = { id: userId, email: googleUser.email, name: googleUser.name, avatar_url: googleUser.picture };
    }

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    await context.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, user.id as string, expiresAt).run();

    const response = Response.redirect(`${appUrl}/`, 302);
    const headers = new Headers(response.headers);
    headers.set('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${url.protocol === 'https:' ? '; Secure' : ''}`);
    
    return new Response(null, {
      status: 302,
      headers: headers,
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return Response.redirect(`${appUrl}/?error=auth_failed`, 302);
  }
};

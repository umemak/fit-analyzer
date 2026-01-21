interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  APP_URL: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
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
    const redirectUri = `${appUrl}/api/auth/github`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${context.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': githubAuthUrl,
        'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${url.protocol === 'https:' ? '; Secure' : ''}`,
      },
    });
  }

  const storedState = getCookieValue(context.request.headers.get('Cookie'), 'oauth_state');
  if (!stateParam || stateParam !== storedState) {
    return Response.redirect(`${appUrl}/?error=invalid_state`, 302);
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: context.env.GITHUB_CLIENT_ID,
        client_secret: context.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };

    if (tokenData.error || !tokenData.access_token) {
      return Response.redirect(`${appUrl}/?error=auth_failed`, 302);
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'FIT-Analyzer',
      },
    });

    const githubUser = await userResponse.json() as GitHubUser;

    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'FIT-Analyzer',
        },
      });
      const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean }>;
      const primaryEmail = emails.find(e => e.primary);
      email = primaryEmail?.email || `${githubUser.id}@github.local`;
    }

    let user = await context.env.DB.prepare(
      'SELECT * FROM users WHERE provider = ? AND provider_id = ?'
    ).bind('github', String(githubUser.id)).first();

    if (!user) {
      const userId = generateId();
      await context.env.DB.prepare(
        'INSERT INTO users (id, email, name, avatar_url, provider, provider_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(userId, email, githubUser.name || githubUser.login, githubUser.avatar_url, 'github', String(githubUser.id)).run();
      
      user = { id: userId, email, name: githubUser.name || githubUser.login, avatar_url: githubUser.avatar_url };
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
    console.error('GitHub OAuth error:', error);
    return Response.redirect(`${appUrl}/?error=auth_failed`, 302);
  }
};

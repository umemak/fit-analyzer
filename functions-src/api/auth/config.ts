interface Env {
  GITHUB_CLIENT_ID?: string;
  GOOGLE_CLIENT_ID?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const config = {
    githubEnabled: !!(context.env.GITHUB_CLIENT_ID),
    googleEnabled: !!(context.env.GOOGLE_CLIENT_ID),
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};

export const config = {
  runtime: 'nodejs',
};

type Request = { headers: Record<string, string | string[] | undefined> };
type Response = { status: (code: number) => Response; json: (body: unknown) => Response };

// Free Supabase projects pause after 7 days without database activity, so the
// ping has to reach Postgres, not just this function.
export default async function handler(req: Request, res: Response) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(500).json({ success: false, error: 'Supabase env vars are not set' });
  }

  try {
    const response = await fetch(`${url}/rest/v1/settings?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[${new Date().toISOString()}] Keep-alive: Supabase responded ${response.status}`);
    return res.status(response.ok ? 200 : 502).json({
      success: response.ok,
      supabaseStatus: response.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Keep-alive ping failed:', error);
    return res.status(502).json({ success: false, error: error instanceof Error ? error.message : 'Ping failed' });
  }
}

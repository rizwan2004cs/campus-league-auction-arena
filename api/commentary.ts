import { pickMeme, buildSystemPrompt, AUCTION_EVENTS, type AuctionEventContext } from '../src/services/commentaryPrompt.js';

export const config = {
  runtime: 'nodejs',
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Tried in order. Groq retires models without much notice (llama-3.3-70b-versatile
// went that way), so a second model keeps commentary alive when the first disappears.
// Both are reasoning models: keep the effort low and the reasoning out of the reply.
const MODELS = [
  { model: 'qwen/qwen3.8-27b', options: { reasoning_format: 'hidden' } },
  { model: 'openai/gpt-oss-120b', options: { reasoning_effort: 'low', include_reasoning: false } },
];

type Request = { method?: string; body?: unknown };
type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => Response;
  setHeader: (name: string, value: string) => void;
};

const clean = (value: unknown, max = 60) =>
  typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : undefined;

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GROQ_API_KEY is not configured' });
  }

  let body: Record<string, unknown>;
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as Record<string, unknown>;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  if (!AUCTION_EVENTS.includes(body.event as AuctionEventContext['event'])) {
    return res.status(400).json({ error: 'Unknown event' });
  }

  const context: AuctionEventContext = {
    event: body.event as AuctionEventContext['event'],
    playerName: clean(body.playerName),
    teamName: clean(body.teamName),
    price: Number.isFinite(Number(body.price)) ? Number(body.price) : undefined,
  };

  const messages = [
    { role: 'system', content: buildSystemPrompt(pickMeme(context)) },
    { role: 'user', content: JSON.stringify(context) },
  ];

  let lastError = 'Commentary failed';
  for (const { model, options } of MODELS) {
    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, temperature: 0.9, max_tokens: 400, messages, ...options }),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        const detail = await response.text();
        console.error(`Groq ${model} ${response.status}: ${detail.slice(0, 200)}`);
        lastError = `Groq responded ${response.status}`;
        // A bad key will not get better on the next model.
        if (response.status === 401) break;
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) {
        return res.status(200).json({ text, model });
      }
      lastError = 'Empty completion';
    } catch (error) {
      console.error(`Commentary generation failed on ${model}:`, error);
      lastError = error instanceof Error ? error.message : 'Commentary failed';
    }
  }

  return res.status(502).json({ error: lastError });
}

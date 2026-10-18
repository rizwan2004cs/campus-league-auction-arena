import { fallbackCommentary, type AuctionEventContext } from './commentaryPrompt';

// The Groq key lives only on the server (api/commentary.ts, env GROQ_API_KEY).
// The browser sends the event and gets back one line of commentary.
export const generateAuctionCommentary = async (context: AuctionEventContext): Promise<string> => {
  try {
    const response = await fetch('/api/commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Commentary API ${response.status}`);
    }

    const data = await response.json();
    return data.text || fallbackCommentary(context);
  } catch (error) {
    console.warn('Commentary unavailable, using fallback:', error);
    return fallbackCommentary(context);
  }
};

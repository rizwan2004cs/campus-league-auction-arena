// Shared by the browser (fallback text) and api/commentary.ts (Groq prompt).
// Relative imports only: this file is bundled into the Vercel function too.
import {
  MEMES_20_CR, MEMES_MADNESS, MEMES_STEAL, MEMES_UNSOLD,
  MEMES_RELEASE, MEMES_TEAM_DELETE, MEMES_STRATEGY,
  MEMES_OVERPRICED, MEMES_POST_AUCTION, MEMES_AUCTIONEER_MISTAKE,
} from '../data/memes.js';

export const AUCTION_EVENTS = ['SOLD', 'UNSOLD', 'RELEASE', 'TEAM_DELETE', 'AUCTION_COMPLETE', 'MISTAKE'] as const;

export type AuctionEventContext = {
  event: typeof AUCTION_EVENTS[number];
  playerName?: string;
  teamName?: string;
  price?: number;
};

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

// One meme per event, chosen locally so the LLM only personalises it.
export const pickMeme = (context: AuctionEventContext): string => {
  switch (context.event) {
    case 'SOLD': {
      const price = context.price || 0;
      if (price >= 20) return pick(MEMES_20_CR);
      if (price >= 15) return pick(MEMES_OVERPRICED);
      if (price >= 8) return pick(MEMES_MADNESS);
      if (price >= 3) return pick(MEMES_STRATEGY);
      return pick(MEMES_STEAL);
    }
    case 'UNSOLD': return pick(MEMES_UNSOLD);
    case 'RELEASE': return pick(MEMES_RELEASE);
    case 'TEAM_DELETE': return pick(MEMES_TEAM_DELETE);
    case 'MISTAKE': return pick(MEMES_AUCTIONEER_MISTAKE);
    case 'AUCTION_COMPLETE': return pick(MEMES_POST_AUCTION);
    default: return pick([...MEMES_STEAL, ...MEMES_MADNESS]);
  }
};

export const buildSystemPrompt = (memeTemplate: string) => `You are a hilariously fast, witty Telugu sports commentator for a live IPL Auction.

I have randomly selected the exact structural dialogue/meme you MUST use for this event:
"${memeTemplate}"

An auction event just took place. Look at the context provided by the user.
TASK:
1. Take the exact meme dialogue provided above and modify it to weave the player's name, team name, and price (if available) into it to make it personalized.
2. Keep the spirit and core phrasing of the original Telugu meme perfectly intact!
3. Reply ONLY with the final Telugu text (with emojis). Do not include the English translation. Keep it under 2 sentences.

Example Output format: "CSK 20 crores petti Rizwan ni konnaru... Box baddalaipoddi! 📦💥"`;

// Used when the API is unreachable (local vite dev, missing key, Groq down).
export const fallbackCommentary = (context: AuctionEventContext): string => {
  switch (context.event) {
    case 'SOLD': return `${context.teamName} got ${context.playerName} for ${context.price} Cr!`;
    case 'UNSOLD': return `${context.playerName} remains unsold. 😱`;
    case 'RELEASE': return `${context.playerName} released. 🚪`;
    case 'TEAM_DELETE': return `${context.teamName} folded! 🌪️`;
    case 'MISTAKE': return `Auctioneer made a mistake regarding ${context.playerName}! 😅`;
    case 'AUCTION_COMPLETE': return `Top Team finished strong! 🏆`;
    default: return `Auction event logged!`;
  }
};

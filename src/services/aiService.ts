import { 
  MEMES_20_CR, MEMES_MADNESS, MEMES_STEAL, MEMES_UNSOLD, 
  MEMES_RELEASE, MEMES_TEAM_DELETE, MEMES_STRATEGY, 
  MEMES_UNCAPPED_STEAL, MEMES_BROKE, MEMES_OVERPRICED, 
  MEMES_CONFUSION, MEMES_RIVALRY, MEMES_POST_AUCTION, 
  MEMES_AUCTIONEER_MISTAKE
} from '@/data/memes';

// We will pick exactly one meme per event locally to avoid LLM bias.

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

type AuctionEventContext = {
  event: 'SOLD' | 'UNSOLD' | 'RELEASE' | 'TEAM_DELETE' | 'AUCTION_COMPLETE' | 'MISTAKE';
  playerName?: string;
  teamName?: string;
  price?: number;
  stats?: any;
};

export const generateAuctionCommentary = async (context: AuctionEventContext): Promise<string> => {
  if (!API_KEY) {
    console.error("No Groq API Key found");
    return fallbackResponse(context);
  }

  let selectedMemeTemplate = "";

  // 1. Locally pick the relevant meme category based on exact context
  if (context.event === 'SOLD') {
    const price = context.price || 0;
    if (price >= 20) {
      selectedMemeTemplate = MEMES_20_CR[Math.floor(Math.random() * MEMES_20_CR.length)];
    } else if (price >= 15) {
      selectedMemeTemplate = MEMES_OVERPRICED[Math.floor(Math.random() * MEMES_OVERPRICED.length)];
    } else if (price >= 8) {
      selectedMemeTemplate = MEMES_MADNESS[Math.floor(Math.random() * MEMES_MADNESS.length)];
    } else if (price >= 3 && price < 8) {
      selectedMemeTemplate = MEMES_STRATEGY[Math.floor(Math.random() * MEMES_STRATEGY.length)];
    } else {
      selectedMemeTemplate = MEMES_STEAL[Math.floor(Math.random() * MEMES_STEAL.length)];
    }
  } else if (context.event === 'UNSOLD') {
    selectedMemeTemplate = MEMES_UNSOLD[Math.floor(Math.random() * MEMES_UNSOLD.length)];
  } else if (context.event === 'RELEASE') {
    selectedMemeTemplate = MEMES_RELEASE[Math.floor(Math.random() * MEMES_RELEASE.length)];
  } else if (context.event === 'TEAM_DELETE') {
    selectedMemeTemplate = MEMES_TEAM_DELETE[Math.floor(Math.random() * MEMES_TEAM_DELETE.length)];
  } else if (context.event === 'MISTAKE') {
    selectedMemeTemplate = MEMES_AUCTIONEER_MISTAKE[Math.floor(Math.random() * MEMES_AUCTIONEER_MISTAKE.length)];
  } else if (context.event === 'AUCTION_COMPLETE') {
    selectedMemeTemplate = MEMES_POST_AUCTION[Math.floor(Math.random() * MEMES_POST_AUCTION.length)];
  }

  // Fallback to random if something slipped through
  if (!selectedMemeTemplate) {
     const ALL = [...MEMES_STEAL, ...MEMES_MADNESS];
     selectedMemeTemplate = ALL[Math.floor(Math.random() * ALL.length)];
  }

  const systemPrompt = `You are a hilariously fast, witty Telugu sports commentator for a live IPL Auction. 

I have randomly selected the exact structural dialogue/meme you MUST use for this event:
"${selectedMemeTemplate}"

An auction event just took place. Look at the context provided by the user. 
TASK: 
1. Take the exact meme dialogue provided above and modify it to weave the player's name, team name, and price (if available) into it to make it personalized.
2. Keep the spirit and core phrasing of the original Telugu meme perfectly intact!
3. Reply ONLY with the final Telugu text (with emojis). Do not include the English translation. Keep it under 2 sentences.

Example Output format: "CSK 20 crores petti Rizwan ni konnaru... Box baddalaipoddi! 📦💥"`;

  const userMessage = JSON.stringify(context);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.9,
        max_tokens: 150,
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || fallbackResponse(context);
    
  } catch (error) {
    console.error("Groq generation failed:", error);
    return fallbackResponse(context);
  }
};

// Fallback logic in case API fails
const fallbackResponse = (context: AuctionEventContext): string => {
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

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  MEMES_20_CR, MEMES_STEAL, MEMES_UNSOLD, MEMES_RELEASE, MEMES_AUCTIONEER_MISTAKE, MEMES_MADNESS,
} from '@/data/memes';
import { cn } from '@/lib/utils';

// The library carries an English gloss in brackets; the feed shows the Telugu line as it lands.
const line = (meme: string) => meme.replace(/\s*\(.*?\)\s*$/, '').trim();

const FEED = [
  { tag: 'Sold · 20 Cr', tone: 'bg-tan text-white', text: line(MEMES_20_CR[0]) },
  { tag: 'Unsold', tone: 'bg-ink text-stage', text: line(MEMES_UNSOLD[0]) },
  { tag: 'Sold · 2 Cr', tone: 'bg-outfield text-white', text: line(MEMES_STEAL[1]) },
  { tag: 'Released', tone: 'bg-[#e9a23b] text-ink', text: line(MEMES_RELEASE[0]) },
  { tag: 'Sold · 9 Cr', tone: 'bg-tan text-white', text: line(MEMES_MADNESS[0]) },
  { tag: 'Auctioneer slip', tone: 'bg-ink text-stage', text: line(MEMES_AUCTIONEER_MISTAKE[0]) },
];

const TYPING_MS = 900;
const READ_MS = 2400;

const CommentaryFeed = ({ className }: { className?: string }) => {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(reduceMotion ? 3 : 1);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const read = window.setTimeout(() => setTyping(true), READ_MS);
    const land = window.setTimeout(() => {
      setTyping(false);
      setCount(c => c + 1);
    }, READ_MS + TYPING_MS);
    return () => { window.clearTimeout(read); window.clearTimeout(land); };
  }, [count, reduceMotion]);

  // Newest at the bottom, the last three on screen, looping through the feed.
  const visible = Array.from({ length: Math.min(count, 3) }, (_, i) => {
    const n = count - Math.min(count, 3) + i;
    return { key: n, ...FEED[n % FEED.length] };
  });

  return (
    <div className={cn('mx-auto w-full max-w-[340px] rounded-[46px] bg-ink p-3 shadow-[0_40px_80px_-40px_rgb(28_26_23/0.8)]', className)} aria-hidden>
      <div className="flex h-[560px] flex-col overflow-hidden rounded-[36px] bg-stage">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <span className="flex items-center gap-2">
            <img src="/icons/logo.png" alt="" className="h-7 w-auto" />
            <span className="text-sm font-semibold text-ink">CPL Live</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-tan">
            <span className="h-2 w-2 animate-pulse rounded-full bg-tan motion-reduce:animate-none" /> Live
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-3 px-4 pb-5">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map(item => (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', bounce: 0.35, duration: 0.5 }}
                className="rounded-[22px] rounded-bl-md bg-surface p-4 shadow-[0_10px_24px_-18px_rgb(28_26_23/0.6)]"
              >
                <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', item.tone)}>{item.tag}</span>
                <p className="mt-2 text-[17px] leading-snug text-ink">{item.text}</p>
              </motion.div>
            ))}
            {typing && (
              <motion.div
                key="typing"
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex w-fit gap-1.5 rounded-[18px] rounded-bl-md bg-surface px-4 py-3"
              >
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-soft"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CommentaryFeed;

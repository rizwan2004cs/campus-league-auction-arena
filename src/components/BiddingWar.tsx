import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// A made-up lot on a loop, told the way the ground's scoreboard would tell it.
const PADDLES = ['07', '12', '23', '31'];
const BIDS = [
  { paddle: 0, price: 2 },
  { paddle: 2, price: 3.5 },
  { paddle: 1, price: 5 },
  { paddle: 3, price: 6 },
  { paddle: 2, price: 7.5 },
];
// Doto's full stop reads like a plus at display sizes; draw the decimal point as one lit square.
export const LedNumber = ({ value }: { value: number }) => {
  const [whole, fraction] = String(value).split('.');
  return (
    <>
      {whole}
      {fraction && (
        <>
          <span className="mx-[0.06em] inline-block h-[0.13em] w-[0.13em] bg-current align-baseline" />
          {fraction}
        </>
      )}
    </>
  );
};

const STEP_MS = 1150;
const SOLD_MS = 2400;

const BiddingWar = ({ className, bare = false }: { className?: string; bare?: boolean }) => {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(reduceMotion ? BIDS.length : 0);
  const sold = step >= BIDS.length;
  const bid = BIDS[Math.min(step, BIDS.length - 1)];

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setTimeout(() => setStep(s => (s >= BIDS.length ? 0 : s + 1)), sold ? SOLD_MS : STEP_MS);
    return () => window.clearTimeout(id);
  }, [step, sold, reduceMotion]);

  return (
    <div className={cn('relative w-full select-none', !bare && 'max-w-[560px]', className)} aria-hidden>
      <div
        className={cn('relative overflow-hidden', bare ? 'text-[var(--c-led)]' : 'led rounded-[22px] p-7 md:p-9')}
        style={bare ? { textShadow: '0 0 8px rgb(255 181 71 / 0.55)' } : {
          backgroundImage: 'radial-gradient(rgb(255 181 71 / 0.07) 1.2px, transparent 1.6px)',
          backgroundSize: '10px 10px',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="dot-label text-[14px]">Lot 07 · Batter</span>
          <span className="dot-label flex items-center gap-2 text-[14px]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff5a4f] motion-reduce:animate-none" /> Live
          </span>
        </div>

        <div className={cn('relative flex items-center justify-center', bare ? 'my-14 h-[190px]' : 'my-8 h-[132px] md:h-[150px]')}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={bid.price}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn('dot', bare ? 'text-[150px] xl:text-[176px]' : 'text-[112px] md:text-[132px]')}
            >
              <LedNumber value={bid.price} /><span className="ml-3 text-[0.32em]">Cr</span>
            </motion.p>
          </AnimatePresence>

          <AnimatePresence>
            {sold && (
              <motion.span
                key="sold"
                initial={{ scale: 1.6, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: -8 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.35, duration: 0.45 }}
                className="absolute right-0 top-1/2 -mt-6 rounded-md border-[3px] border-[#ff5a4f] px-3 py-1 font-display text-[28px] uppercase leading-none tracking-wide text-[#ff5a4f]"
                style={{ textShadow: 'none' }}
              >
                Sold
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="dot-label text-[12px] opacity-70">Paddles</p>
            <div className="mt-2 flex gap-2">
              {PADDLES.map((number, i) => {
                const lit = bid.paddle === i;
                return (
                  <span
                    key={number}
                    className={cn(
                      'dot grid h-11 w-11 place-items-center rounded-md border text-[18px] transition-colors duration-200',
                      lit ? 'border-[var(--c-led)] bg-[var(--c-led)] text-[var(--c-board)]' : 'border-[rgb(255_181_71/0.25)] text-[rgb(255_181_71/0.45)]',
                    )}
                    style={lit ? { textShadow: 'none' } : undefined}
                  >
                    {number}
                  </span>
                );
              })}
            </div>
          </div>
          <p className="dot-label text-right text-[12px] opacity-70">
            {sold ? 'Hammer down' : `Bid ${Math.min(step, BIDS.length - 1) + 1} of ${BIDS.length}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BiddingWar;

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Gavel } from 'lucide-react';
import PlayerPhoto from '@/components/PlayerPhoto';
import { CategoryMark, type Player } from '@/components/PlayerCard';

const CONFETTI_COLOURS = ['#d1343e', '#d1343e', '#fd8287', '#ffc496', '#f6d365', '#2f7a4a'];

interface SoldCelebrationProps {
  player: Player;
  teamName: string;
  price: number;
  onClose: () => void;
}

// One burst of paper from the middle of the screen, falling with a little drift.
const Confetti = () => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 70 + Math.random() * 0.4;
        const distance = 260 + Math.random() * 420;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance * 0.7 - 120,
          rotate: Math.random() * 720 - 360,
          size: 6 + Math.random() * 8,
          round: Math.random() > 0.6,
          colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
          delay: Math.random() * 0.15,
        };
      }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map(p => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2"
          style={{
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            borderRadius: p.round ? 999 : 2,
            background: p.colour,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{
            x: p.x,
            y: [0, p.y, p.y + 420],
            opacity: [1, 1, 0],
            rotate: p.rotate,
            scale: 1,
          }}
          transition={{ duration: 2.6, delay: p.delay, ease: [0.15, 0.7, 0.4, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
};

const SoldCelebration = ({ player, teamName, price, onClose }: SoldCelebrationProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      role="status"
      aria-live="assertive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      onClick={onClose}
      className="fixed inset-0 z-[60] grid cursor-pointer place-items-center overflow-hidden bg-[#f8e0d9] p-4 md:p-10"
    >
      {!reduceMotion && <Confetti />}

      <div className="relative grid w-full max-w-5xl items-center gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-12">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: -3, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
          className="mx-auto w-full max-w-[340px]"
        >
          <div className="panel overflow-hidden p-2">
            <PlayerPhoto
              src={player.image_url}
              name={player.name}
              priority
              className="aspect-[4/5] w-full rounded-[14px]"
            />
          </div>
        </motion.div>

        <div className="text-center md:text-left">
          <motion.div
            initial={reduceMotion ? false : { scale: 0 }}
            animate={reduceMotion ? { scale: 1 } : { scale: 1, rotate: [0, -10, 10, -6, 6, -4] }}
            transition={{ delay: 0.15, duration: 0.7, ease: 'easeInOut' }}
            className="inline-flex items-center gap-3 rounded-full bg-[#d1343e] px-7 py-3 text-white shadow-[0_16px_40px_-12px_rgb(198_61_73/0.8)]"
          >
            <Gavel className="h-7 w-7 md:h-9 md:w-9" />
            <span className="figure tracking-tight" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>Sold!</span>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45, type: 'spring', bounce: 0.3 }}
            className="mt-6 space-y-3"
          >
            <CategoryMark category={player.category} className="text-sm" />
            <p className="font-display text-ink" style={{ fontSize: 'clamp(2rem, 4.6vw, 4rem)' }}>{player.name}</p>
            <p className="text-xl text-ink md:text-2xl">
              joins <span className="font-semibold">{teamName}</span>
            </p>
          </motion.div>

          <motion.p
            initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.75, type: 'spring', bounce: 0.6 }}
            className="mt-6 inline-flex items-baseline gap-2 rounded-2xl bg-white px-6 py-3"
          >
            <span className="figure text-[#d1343e]" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>{price}</span>
            <span className="text-xl font-semibold text-[#d1343e]">Cr</span>
          </motion.p>

          <p className="mt-6 text-sm text-soft">Tap anywhere to continue</p>
        </div>
      </div>
    </motion.div>
  );
};

export default SoldCelebration;

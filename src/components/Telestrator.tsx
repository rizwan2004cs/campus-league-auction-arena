import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Two loops that never quite close, like a commentator circling a replay.
const RING = 'M 8 46 C 6 18, 60 4, 148 6 C 236 8, 296 22, 292 50 C 288 80, 220 94, 140 92 C 62 90, 4 76, 10 44 C 14 22, 70 10, 162 14';
const UNDERLINE = 'M 4 10 C 60 4, 140 2, 296 8';

interface TelestratorProps {
  children: React.ReactNode;
  /** ring: loop around the content. underline: a quick swipe under it. */
  mark?: 'ring' | 'underline';
  /** mount: draw on first render. view: draw when scrolled into view. hover: draw while hovered. */
  trigger?: 'mount' | 'view' | 'hover';
  delay?: number;
  className?: string;
  colour?: string;
}

const Telestrator = ({ children, mark = 'ring', trigger = 'view', delay = 0, className, colour = 'var(--c-tan)' }: TelestratorProps) => {
  const reduceMotion = useReducedMotion();
  const drawn = { pathLength: 1, opacity: 1 };
  const hidden = { pathLength: 0, opacity: 0 };

  const animate =
    trigger === 'mount' ? { initial: reduceMotion ? drawn : hidden, animate: drawn } :
    trigger === 'view' ? { initial: reduceMotion ? drawn : hidden, whileInView: drawn, viewport: { once: true, margin: '-60px' } } :
    { initial: hidden, variants: { hover: drawn } };

  return (
    <motion.span
      className={cn('relative inline-block', className)}
      whileHover={trigger === 'hover' ? 'hover' : undefined}
    >
      <span className="relative z-[1]">{children}</span>
      <svg
        aria-hidden
        viewBox={mark === 'ring' ? '0 0 300 100' : '0 0 300 14'}
        preserveAspectRatio="none"
        className={cn(
          'pointer-events-none absolute overflow-visible',
          mark === 'ring' ? '-left-[14%] -top-[22%] h-[144%] w-[128%]' : '-bottom-[0.18em] left-0 h-[0.3em] w-full',
        )}
      >
        <motion.path
          d={mark === 'ring' ? RING : UNDERLINE}
          fill="none"
          stroke={colour}
          strokeWidth={mark === 'ring' ? 3.2 : 4}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          transition={{ pathLength: { duration: mark === 'ring' ? 0.9 : 0.45, delay, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.1, delay } }}
          {...animate}
        />
      </svg>
    </motion.span>
  );
};

export default Telestrator;

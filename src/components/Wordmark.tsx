import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

const LINES = ['Campus Premier League'];

const word: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

const letter: Variants = {
  hidden: (tilt: number) => ({ y: '-60%', rotate: tilt * 3, opacity: 0 }),
  show: { y: 0, rotate: 0, opacity: 1, transition: { type: 'spring', bounce: 0.5, duration: 0.7 } },
};

// The name in one line across the full width, its lower half sliced off by the bottom of the page.
// Letters drop in like scoreboard plates and hop when touched.
const Wordmark = ({ className, shadowColour = 'var(--c-led)' }: { className?: string; shadowColour?: string }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.p
      aria-label="Campus Premier League"
      className={cn('wordmark select-none whitespace-nowrap leading-[0.86]', className)}
      style={{ fontSize: '5.55vw' }}
      variants={word}
      initial={reduceMotion ? 'show' : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {LINES.map((text, line) => (
        <span key={text} aria-hidden className={cn('flex justify-center', line === LINES.length - 1 && '-mb-[0.2em]')}>
          {text.split('').map((char, i) => {
            if (char === ' ') return <span key={i} className="inline-block w-[0.32em]" />;
            const tilt = (((line * 7 + i) * 37) % 11) - 5;
            return (
              <motion.span
                key={i}
                custom={tilt}
                variants={letter}
                className="inline-block cursor-default"
                style={{ textShadow: `0.04em 0.04em 0 ${shadowColour}` }}
                whileHover={reduceMotion ? undefined : { y: '-10%', rotate: tilt * 2, transition: { type: 'spring', bounce: 0.7, duration: 0.35 } }}
              >
                {char}
              </motion.span>
            );
          })}
        </span>
      ))}
    </motion.p>
  );
};

export default Wordmark;

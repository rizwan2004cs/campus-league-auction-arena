import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import PlayerPhoto from '@/components/PlayerPhoto';
import { CategoryMark, type Player } from '@/components/PlayerCard';

interface ScrollRailProps {
  players: Player[];
  title: string;
  subtitle?: string;
}

// One row of players that slides sideways while the page scrolls down past it.
const ScrollRail = ({ players, title, subtitle }: ScrollRailProps) => {
  const reduceMotion = useReducedMotion();
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const [distance, setDistance] = useState(0);

  // How far the row has to travel: its full width minus what already fits on screen.
  useLayoutEffect(() => {
    const measure = () => {
      if (!track.current) return;
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth + 48));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [players.length]);

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  const heading = (
    <div className="mx-auto mb-8 flex w-full max-w-[1320px] items-end justify-between gap-6 px-5 md:px-10">
      <div>
        <h2 className="page-header" style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)' }}>{title}</h2>
        {subtitle && <p className="mt-3 max-w-[48ch] text-ink">{subtitle}</p>}
      </div>
      <p className="dot-label hidden shrink-0 text-[13px] text-soft md:block">{players.length} on the list</p>
    </div>
  );

  const cards = players.map(player => (
    <li key={player.id} className="w-[220px] shrink-0 snap-start md:w-[260px]">
      <div className="relative">
        {/* Eager: the row slides in faster than lazy loading notices it. */}
        <PlayerPhoto src={player.image_url} name={player.name} priority className="aspect-[4/5] w-full rounded-[20px]" />
        <CategoryMark category={player.category} className="absolute left-3 top-3" />
      </div>
      <p className="mt-3 truncate font-display text-lg text-ink">{player.name}</p>
      <p className="text-sm text-soft"><span className="dot text-base text-tan">{player.base_price}</span> Cr base</p>
    </li>
  ));

  if (reduceMotion) {
    return (
      <section className="py-20 lg:py-28">
        {heading}
        <ul className="no-scrollbar mx-auto flex max-w-[1320px] snap-x gap-4 overflow-x-auto scroll-px-5 px-5 md:scroll-px-10 md:px-10">{cards}</ul>
      </section>
    );
  }

  return (
    <section ref={section} className="relative" style={{ height: `calc(100svh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        {heading}
        <motion.ul ref={track} style={{ x }} className="flex w-max gap-4 pl-5 md:pl-10">
          {cards}
        </motion.ul>
      </div>
    </section>
  );
};

export default ScrollRail;

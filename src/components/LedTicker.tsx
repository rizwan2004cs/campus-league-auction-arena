import { cn } from '@/lib/utils';

interface LedTickerProps {
  items: string[];
  className?: string;
  label?: string;
}

// A stadium perimeter board: amber dot-matrix text running past on black.
const LedTicker = ({ items, className, label = 'Live from the auction' }: LedTickerProps) => {
  if (items.length === 0) return null;
  const run = [...items, ...items];

  return (
    <div className={cn('led relative overflow-hidden py-3', className)} role="marquee" aria-label={label}>
      <ul className="sr-only">
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>
      <div
        aria-hidden
        className="ticker-track flex w-max items-center gap-10 whitespace-nowrap"
        style={{ '--ticker-duration': `${Math.max(24, items.length * 7)}s` } as React.CSSProperties}
      >
        {run.map((item, i) => (
          <span key={i} className="dot-label flex items-center gap-10 text-[17px] md:text-[19px]">
            {item}
            <span className="text-[#ff5a4f]">●</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default LedTicker;

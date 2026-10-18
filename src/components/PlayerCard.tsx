import { Trash2 } from 'lucide-react';
import PlayerPhoto from '@/components/PlayerPhoto';
import { cn } from '@/lib/utils';

export type Player = {
  id: string;
  name: string;
  category: 'Bowler' | 'Batter' | 'All-Rounder';
  points: number;
  priority: number;
  base_price: number;
  image_url?: string;
  sold: boolean;
  sold_to?: string;
  bid_price?: number;
};

export const categoryClass = (category: string) =>
  category === 'Bowler' ? 'cat-bowler' : category === 'Batter' ? 'cat-batter' : 'cat-allrounder';

export const CategoryMark = ({ category, short = false, className }: { category: string; short?: boolean; className?: string }) => (
  <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-semibold leading-5', categoryClass(category), className)}>
    {short ? category.charAt(0) : category}
  </span>
);

interface PlayerCardProps {
  player: Player;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  isAuctionCard?: boolean;
  priority?: boolean;
}

const PlayerCard = ({ player, onDelete, showActions = true, priority = false }: PlayerCardProps) => {
  const { id, name, category, points, base_price, image_url, sold, bid_price, sold_to } = player;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[14px] bg-surface">
      <div className="relative">
        <PlayerPhoto
          src={image_url}
          name={name}
          priority={priority}
          className="aspect-[4/5] w-full"
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
        />
        <CategoryMark category={category} className="absolute left-3 top-3" />
        {sold && (
          <span className="absolute right-3 top-3 rounded-md bg-tan px-2 py-0.5 text-[13px] font-semibold leading-5 text-tan-ink">
            Sold
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-semibold text-ink">{name}</h3>
          {sold && sold_to && <p className="truncate text-sm text-soft">{sold_to}</p>}
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-raised px-3 py-2">
            <dt className="text-soft">Points</dt>
            <dd className="text-lg font-semibold text-ink">{points}</dd>
          </div>
          <div className="rounded-lg bg-raised px-3 py-2">
            <dt className="text-soft">{sold && bid_price ? 'Sold for' : 'Base'}</dt>
            <dd className={cn('text-lg font-semibold', sold && bid_price ? 'text-tan' : 'text-ink')}>
              {sold && bid_price ? bid_price : base_price} Cr
            </dd>
          </div>
        </dl>

        {showActions && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(id)}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium text-soft transition-colors hover:bg-raised hover:text-leather"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        )}
      </div>
    </article>
  );
};

export default PlayerCard;

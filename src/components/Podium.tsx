import { motion, useReducedMotion } from 'framer-motion';
import { Crown } from 'lucide-react';
import PlayerPhoto from '@/components/PlayerPhoto';
import type { Player } from '@/components/PlayerCard';
import type { RankedTeam } from '@/lib/ranking';
import { cn } from '@/lib/utils';

// Highest-priority pick, then most points, then the biggest spend.
const bestBuy = (players: Player[] = []) =>
  [...players].sort((a, b) =>
    a.priority - b.priority || b.points - a.points || (b.bid_price || 0) - (a.bid_price || 0),
  )[0] ?? null;

const PLACES = [
  { place: 1, height: 'h-48 md:h-60', colour: 'bg-tan text-white', vibe: 'Leading the pack' },
  { place: 2, height: 'h-36 md:h-44', colour: 'bg-ink text-stage', vibe: 'Breathing down their neck' },
  { place: 3, height: 'h-28 md:h-32', colour: 'bg-[#e9a23b] text-ink', vibe: 'Still in the hunt' },
];

// Columns left to right on wide screens: 2nd, 1st, 3rd.
const ORDER = [1, 0, 2];

interface PodiumProps {
  /** Ranked teams that have signed at least one player, best first. */
  teams: RankedTeam[];
}

const Podium = ({ teams }: PodiumProps) => {
  const reduceMotion = useReducedMotion();
  const shared = (rank: number | null) => rank !== null && teams.filter(t => t.rank === rank).length > 1;

  return (
    <ol className="grid grid-cols-1 items-end gap-4 md:grid-cols-3 md:gap-5" aria-label="Podium">
      {ORDER.map((slot, column) => {
        const place = PLACES[slot];
        const team = teams[slot];
        const pick = team ? bestBuy(team.players) : null;
        const rankText = team?.rank ? `${shared(team.rank) ? '=' : ''}${team.rank}` : String(place.place);

        return (
          <li key={place.place} className={cn('flex flex-col', slot === 0 ? 'order-first md:order-none' : slot === 1 ? 'order-2 md:order-none' : 'order-3')}>
            {/* The plate on top of the step */}
            <motion.div
              initial={reduceMotion ? false : { y: -30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', bounce: 0.45, duration: 0.7, delay: 0.35 + column * 0.12 }}
              className={cn('panel relative z-[1] mx-2 -mb-4 p-5', !team && 'border-dashed bg-transparent shadow-none')}
            >
              {slot === 0 && team && (
                <motion.span
                  aria-hidden
                  className="absolute -top-5 left-1/2 -ml-5 grid h-10 w-10 place-items-center rounded-full bg-[#ffb547] text-ink shadow-[0_8px_20px_-8px_rgb(28_26_23/0.6)]"
                  animate={reduceMotion ? undefined : { rotate: [0, -12, 10, -6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4 }}
                >
                  <Crown className="h-5 w-5" />
                </motion.span>
              )}

              {team ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="dot-label text-[11px] text-tan">{place.vibe}</p>
                      <h3 className="mt-1.5 truncate font-display text-xl text-ink">{team.name}</h3>
                    </div>
                    <p className="dot shrink-0 text-[34px] text-ink">{team.points}<span className="ml-1 text-[13px]">pts</span></p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    {pick ? (
                      <span className="flex min-w-0 items-center gap-2.5">
                        <PlayerPhoto src={pick.image_url} name={pick.name} className="h-9 w-9 shrink-0 rounded-full" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{pick.name}</span>
                          <span className="text-soft">Best buy · {pick.bid_price} Cr</span>
                        </span>
                      </span>
                    ) : <span />}
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold text-ink">{team.purse} Cr</span>
                      <span className="text-soft">left</span>
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <p className="font-display text-lg text-ink">Spot up for grabs</p>
                  <p className="mt-1 text-sm text-soft">Sign a player to climb on.</p>
                </div>
              )}
            </motion.div>

            {/* The step */}
            <motion.div
              initial={reduceMotion ? false : { scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.8, delay: column * 0.12 }}
              style={{ transformOrigin: 'bottom' }}
              className={cn('flex items-end justify-center rounded-t-[22px] pb-4 pt-8', place.height, team ? place.colour : 'bg-raised text-soft/60')}
            >
              <span className="font-display leading-none" style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)' }}>{rankText}</span>
            </motion.div>
          </li>
        );
      })}
    </ol>
  );
};

export default Podium;

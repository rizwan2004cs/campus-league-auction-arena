import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import PlayerPhoto from '@/components/PlayerPhoto';
import { categoryClass } from '@/components/PlayerCard';
import type { Team } from '@/components/TeamCard';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'Batter', label: 'Batters' },
  { key: 'Bowler', label: 'Bowlers' },
  { key: 'All-Rounder', label: 'All-rounders' },
] as const;

interface SquadBoardProps {
  teams: Team[];
  playersPerTeam: number;
  initialPurse: number;
}

// One slim chip per team (purse and open slots at a glance); pick one to open its full squad.
const SquadBoard = ({ teams, playersPerTeam, initialPurse }: SquadBoardProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = teams.find(t => t.id === selectedId) ?? null;

  return (
    <div>
      <div role="tablist" aria-label="Teams" className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {teams.map(team => {
          const players = team.players ?? [];
          const active = team.id === selectedId;
          return (
            <button
              key={team.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="squad-detail"
              onClick={() => setSelectedId(active ? null : team.id)}
              className={cn(
                'min-w-0 rounded-xl border px-3 py-2.5 text-left transition-colors',
                active ? 'border-tan bg-tan text-white' : 'border-line bg-surface text-ink hover:border-tan/50',
              )}
            >
              <span className="block truncate text-sm font-semibold">{team.name}</span>
              <span className="mt-1 flex items-center justify-between gap-2">
                <span className={cn('text-xs', active ? 'text-white/85' : 'text-soft')}>
                  <span className="dot text-[13px]">{team.purse}</span> Cr
                </span>
                {/* Slot pips: one dot per slot, filled when signed, grouped by category. */}
                <span className="flex items-center gap-1.5" aria-label={`${players.length} signed`}>
                  {CATEGORIES.map(({ key }) => {
                    const signed = players.filter(p => p.category === key).length;
                    return (
                      <span key={key} className="flex gap-0.5">
                        {Array.from({ length: playersPerTeam }, (_, i) => (
                          <span
                            key={i}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              i < signed ? (active ? 'bg-white' : categoryClass(key)) : active ? 'bg-white/30' : 'bg-line',
                            )}
                          />
                        ))}
                      </span>
                    );
                  })}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            id="squad-detail"
            key={selected.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="panel mt-3 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="truncate font-display text-xl text-ink">{selected.name}</h4>
                  <p className="mt-0.5 text-sm text-soft">
                    <span className="dot text-[15px] text-tan">{selected.purse}</span> of {initialPurse} Cr left ·{' '}
                    <span className="dot text-[15px] text-ink">{selected.points}</span> pts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-lg p-2 text-soft transition-colors hover:bg-raised hover:text-ink"
                  aria-label="Close squad"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {CATEGORIES.map(({ key, label }) => {
                  const signed = (selected.players ?? []).filter(p => p.category === key);
                  const slots = Math.max(playersPerTeam, signed.length);
                  return (
                    <div key={key}>
                      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-soft">
                        <span className={cn('h-2 w-2 rounded-full', categoryClass(key))} />
                        {label}
                        <span className="ml-auto">{signed.length}/{playersPerTeam}</span>
                      </p>
                      <ul className="space-y-1.5">
                        {Array.from({ length: slots }, (_, i) => {
                          const player = signed[i];
                          return player ? (
                            <li key={player.id} className="flex items-center gap-2.5 rounded-lg bg-raised px-2 py-1.5">
                              <PlayerPhoto src={player.image_url} name={player.name} className="h-7 w-7 shrink-0 rounded-full" />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{player.name}</span>
                              <span className="dot shrink-0 text-sm text-tan">{player.bid_price}<span className="ml-0.5 text-[11px] text-soft">Cr</span></span>
                            </li>
                          ) : (
                            <li key={`open-${i}`} className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-soft">
                              Open slot
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SquadBoard;

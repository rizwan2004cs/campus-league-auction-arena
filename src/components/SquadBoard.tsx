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

// Every squad at a glance: purse, points, and which slots are still open per category.
const SquadBoard = ({ teams, playersPerTeam, initialPurse }: SquadBoardProps) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
    {teams.map(team => {
      const players = team.players ?? [];
      const spent = Math.max(0, initialPurse - team.purse);
      const left = Math.min(100, Math.max(0, (team.purse / initialPurse) * 100));
      const open = CATEGORIES.reduce(
        (sum, { key }) => sum + Math.max(0, playersPerTeam - players.filter(p => p.category === key).length),
        0,
      );

      return (
        <article key={team.id} className="panel flex flex-col p-5">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="truncate font-display text-lg text-ink">{team.name}</h4>
              <p className="mt-0.5 text-sm text-soft">
                {players.length} signed · {open} {open === 1 ? 'slot' : 'slots'} open
              </p>
            </div>
            <p className="shrink-0 text-right">
              <span className="dot block text-[26px] leading-none text-ink">{team.points}</span>
              <span className="text-xs text-soft">pts</span>
            </p>
          </header>

          <div className="mt-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-soft">Purse left</span>
              <span>
                <span className="dot text-lg text-tan">{team.purse}</span>
                <span className="text-soft"> / {initialPurse} Cr</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-raised" title={`${spent} Cr spent`}>
              <div className="h-full rounded-full bg-tan transition-[width] duration-500" style={{ width: `${left}%` }} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {CATEGORIES.map(({ key, label }) => {
              const signed = players.filter(p => p.category === key);
              const slots = Math.max(playersPerTeam, signed.length);
              return (
                <div key={key}>
                  <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-soft">
                    <span className={cn('h-2 w-2 rounded-full', categoryClass(key))} />
                    {label}
                    <span className="ml-auto">{signed.length}/{playersPerTeam}</span>
                  </p>
                  <ul className="grid grid-cols-1 gap-1.5">
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
        </article>
      );
    })}
  </div>
);

export default SquadBoard;

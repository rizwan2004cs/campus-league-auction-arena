import { useMemo } from 'react';
import { Team } from './TeamCard';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  teams: Team[];
  startIndex?: number;
}

// Points first; on a tie, the stronger picks (lower priority sum), then the bigger purse.
const rank = (teams: Team[]) =>
  teams
    .map(team => ({
      ...team,
      prioritySum: (team.players ?? []).reduce((sum, p) => sum + (p.priority || 0), 0),
    }))
    .sort((a, b) => b.points - a.points || a.prioritySum - b.prioritySum || b.purse - a.purse);

const Leaderboard = ({ teams, startIndex = 1 }: LeaderboardProps) => {
  const ranked = useMemo(() => rank(teams), [teams]);

  return (
    <div className="flex flex-col">
      <h3 className="px-5 pb-2 pt-4 text-[15px] font-semibold text-ink">Standings</h3>

      {teams.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-soft">Add teams to see the standings.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-soft">
            <tr>
              <th className="w-10 px-5 py-2 font-medium">#</th>
              <th className="py-2 font-medium">Team</th>
              <th className="px-3 py-2 text-right font-medium">Purse</th>
              <th className="px-5 py-2 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((team, index) => {
              const position = index + startIndex;
              return (
                <tr key={team.id} className="border-t border-line">
                  <td className="px-5 py-2.5">
                    <span className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold',
                      position === 1 ? 'bg-tan text-tan-ink' : 'text-soft',
                    )}>
                      {position}
                    </span>
                  </td>
                  <td className="max-w-0 py-2.5">
                    <span className="block truncate font-medium text-ink">{team.name}</span>
                    <span className="block truncate text-[13px] text-soft">
                      {team.players?.length ? team.players.map(p => p.name).join(', ') : 'No players yet'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-ink">{team.purse}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-ink">{team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Leaderboard;

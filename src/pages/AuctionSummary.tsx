import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchPublicAuctionData } from '@/services/teamService';
import { Team } from '@/components/TeamCard';
import { Player, CategoryMark } from '@/components/PlayerCard';
import PlayerPhoto from '@/components/PlayerPhoto';
import { cn } from '@/lib/utils';
import { rankLabel, rankTeams } from '@/lib/ranking';
import Podium from '@/components/Podium';

// Highest-priority pick, then most points, then the biggest spend.
const bestBuy = (players: Player[] = []) =>
  [...players].sort((a, b) =>
    a.priority - b.priority || b.points - a.points || (b.bid_price || 0) - (a.bid_price || 0),
  )[0] ?? null;

const AuctionSummary = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicAuctionData().then(({ teams: fetched }) => {
      setTeams([...(fetched || [])].sort((a, b) => b.points - a.points || b.purse - a.purse));
      setLoading(false);
    });
  }, []);

  const ranked = useMemo(() => rankTeams(teams), [teams]);
  const podium = ranked.filter(t => t.rank !== null).slice(0, 3);
  const rest = ranked.slice(podium.length);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-8 md:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-header text-3xl md:text-4xl">Final standings</h1>
          <p className="mt-1 text-ink">Ranked by points. Best buy is each team's top-priority signing.</p>
        </div>
        <button type="button" onClick={() => navigate('/auction')} className="secondary-button inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to the auction
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-80 rounded-[18px]" />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-[18px] bg-surface px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-ink">No franchises yet</h2>
          <p className="mt-1 text-soft">Create teams and run the auction to see standings here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Podium teams={podium} />

          {rest.length > 0 && (
            <ul className="grid gap-3 md:grid-cols-2">
              {rest.map(team => {
                const pick = bestBuy(team.players);
                return (
                  <li key={team.id} className="flex items-center justify-between gap-4 rounded-[14px] bg-surface p-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="w-6 text-right text-soft">{rankLabel(team.rank)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{team.name}</p>
                        <p className="text-sm text-soft">{team.points} pts · {team.players?.length ?? 0} players</p>
                      </div>
                    </div>
                    {pick && (
                      <div className="min-w-0 text-right text-sm">
                        <p className="text-soft">Best buy</p>
                        <p className="truncate font-medium text-ink">{pick.name}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default AuctionSummary;

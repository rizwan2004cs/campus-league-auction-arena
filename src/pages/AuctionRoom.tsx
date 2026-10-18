import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchPublicAuctionData, modifyPlayerBid, fetchRecentlySoldPlayer } from '@/services/teamService';
import { RecentlySoldWidget } from '@/components/RecentlySoldWidget';
import { Player, CategoryMark } from '@/components/PlayerCard';
import PlayerPhoto from '@/components/PlayerPhoto';
import { Team } from '@/components/TeamCard';
import SquadBoard from '@/components/SquadBoard';
import AuctionControls from '@/components/AuctionControls';
import Telestrator from '@/components/Telestrator';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import SoldCelebration from '@/components/SoldCelebration';
import { generateAuctionCommentary } from '@/services/aiService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Batter', 'Bowler', 'All-Rounder'] as const;

interface CelebrationData {
  player: Player;
  team: Team;
  bidAmount: number;
}

const broadcast = (event: string, payload: Record<string, unknown> = {}) =>
  supabase.channel('auction-events').send({ type: 'broadcast', event, payload });

const announce = (title: string, text: Promise<string>) =>
  text.then(t => broadcast('AI_MEME', { text: t, title }));

const AuctionRoom = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [recentlySoldPlayer, setRecentlySoldPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [playersPerTeam, setPlayersPerTeam] = useState(2);
  const [initialPurse, setInitialPurse] = useState(50);
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);

  const unsold = useMemo(() => players.filter(p => !p.sold), [players]);
  const currentPlayer = unsold.find(p => p.id === currentId) ?? unsold[0] ?? null;
  const teamsByName = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);

  const load = useCallback(async () => {
    const [settingsRes, auction, recent] = await Promise.all([
      supabase.from('settings').select('players_per_team, initial_purse').limit(1).maybeSingle(),
      fetchPublicAuctionData(),
      fetchRecentlySoldPlayer(),
    ]);
    if (settingsRes.data) {
      setPlayersPerTeam(settingsRes.data.players_per_team ?? 2);
      setInitialPurse(Number(settingsRes.data.initial_purse) || 50);
    }
    if (auction.error) {
      toast({ title: 'Could not load the auction', description: auction.error.message, variant: 'destructive' });
    } else {
      setPlayers(auction.players);
      setTeams(auction.teams);
    }
    setRecentlySoldPlayer(recent);
    setLoading(false);
  }, [toast]);

  // One bid touches several rows; coalesce the burst of realtime events into one reload.
  const reloadTimer = useRef<number>();
  const scheduleReload = useCallback(() => {
    window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(load, 250);
  }, [load]);

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase.channel('auction-room-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_players' }, scheduleReload)
      .subscribe();
    return () => {
      window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [user, load, scheduleReload]);

  const nextAfter = (playerId: string) => {
    const index = unsold.findIndex(p => p.id === playerId);
    const rest = [...unsold.slice(index + 1), ...unsold.slice(0, Math.max(index, 0))];
    return rest.find(p => p.id !== playerId) ?? null;
  };

  const handlePlaceBid = async (playerId: string, teamId: string, bidAmount: number) => {
    const player = players.find(p => p.id === playerId);
    const team = teams.find(t => t.id === teamId);
    if (!player || !team) return;

    setBidLoading(true);
    const { success, error } = await modifyPlayerBid(playerId, { sold: true, sold_to: teamId, bid_price: bidAmount });
    setBidLoading(false);

    if (!success) {
      toast({ title: 'Bid not placed', description: error?.message, variant: 'destructive' });
      return;
    }

    announce('Live Commentary 🎙️', generateAuctionCommentary({
      event: 'SOLD', playerName: player.name, teamName: team.name, price: bidAmount,
    }));

    setCelebrationData({ player: { ...player, sold: true, sold_to: team.name, bid_price: bidAmount }, team, bidAmount });
    window.setTimeout(() => setCelebrationData(null), 4500);

    setCurrentId(nextAfter(playerId)?.id ?? null);
    await load();
    broadcast('REFRESH');
  };

  const handlePassPlayer = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      announce('Live Commentary 🎙️', generateAuctionCommentary({ event: 'UNSOLD', playerName: player.name }));
    }
    broadcast('PASS', { playerId });
    setCurrentId(nextAfter(playerId)?.id ?? null);
    toast({ title: `${player?.name ?? 'Player'} passed`, description: 'Moved to the next player in the queue.' });
  };

  const handleCompleteAuction = () => {
    announce('Final Verdict 🏆', generateAuctionCommentary({ event: 'AUCTION_COMPLETE' }));
    broadcast('AUCTION_COMPLETE');
    navigate('/summary');
  };

  if (authLoading || (loading && user)) {
    return <AuctionRoomSkeleton />;
  }

  const counts = CATEGORIES.map(c => ({ category: c, count: unsold.filter(p => p.category === c).length }));
  const queue = (category: string) => unsold.filter(p => p.category === category && p.id !== currentPlayer?.id);

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {celebrationData && (
          <SoldCelebration
            player={celebrationData.player}
            teamName={celebrationData.team.name}
            price={celebrationData.bidAmount}
            onClose={() => setCelebrationData(null)}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-4 md:px-8">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h1 className="page-header text-2xl md:text-3xl">Auction</h1>
            <p className="text-sm text-soft">
              <span className="font-semibold text-ink">{unsold.length}</span> players left
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {counts.map(({ category, count }) => (
              <span key={category} className="inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                <CategoryMark category={category} short />
                <span className="text-soft">{category}s</span>
                <span className="font-semibold text-ink">{count}</span>
              </span>
            ))}
            <Button onClick={handleCompleteAuction} className="secondary-button h-10">
              Complete auction
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Stage: fits the viewport on a projector, photo whole at any aspect. */}
          {currentPlayer ? (
            <section aria-label="Player on the block" className="panel overflow-hidden lg:h-[min(calc(100svh-150px),760px)]">
              <div className="grid h-full md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                <PlayerPhoto
                  key={currentPlayer.id}
                  src={currentPlayer.image_url}
                  name={currentPlayer.name}
                  fit="stage"
                  priority
                  className="aspect-[4/5] w-full md:aspect-auto md:h-full"
                />
                <div className="flex min-w-0 flex-col justify-center gap-10 p-6 md:p-8 xl:p-10">
                  <div className="space-y-4">
                    <CategoryMark category={currentPlayer.category} className="text-sm" />
                    <h2
                      className="font-display break-words text-ink"
                      style={{ fontSize: 'clamp(2.25rem, 4.2vw, 5rem)', lineHeight: 0.95 }}
                    >
                      {currentPlayer.name}
                    </h2>
                  </div>

                  <dl className="grid shrink-0 grid-cols-3 gap-3">
                    {[
                      { label: 'Base price', value: currentPlayer.base_price, unit: 'Cr', accent: true },
                      { label: 'Points', value: currentPlayer.points },
                      { label: 'Priority', value: currentPlayer.priority },
                    ].map(({ label, value, unit, accent }) => (
                      <div key={label} className="rounded-xl bg-raised p-4">
                        <dt className="text-sm text-soft">{label}</dt>
                        <dd className={cn('figure mt-2', accent ? 'text-tan' : 'text-ink')} style={{ fontSize: 'clamp(1.75rem, 3vw, 3.5rem)' }}>
                          {accent ? (
                            <Telestrator key={currentPlayer.id} mark="ring" trigger="mount">
                              {value}
                            </Telestrator>
                          ) : (
                            value
                          )}
                          {unit && <span className="ml-1 align-top text-[0.4em]">{unit}</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </section>
          ) : (
            <section className="flex flex-col items-center justify-center gap-4 rounded-[18px] bg-surface p-12 text-center lg:h-[min(calc(100svh-150px),760px)]">
              <h2 className="page-header text-3xl">Every player is sold</h2>
              <p className="max-w-md text-soft">The pool is empty. Close the auction to see the final standings.</p>
              <Button onClick={handleCompleteAuction} className="primary-button">See the summary</Button>
            </section>
          )}

          {/* Console: always beside the stage on large screens. */}
          <aside className="flex flex-col gap-4 lg:h-[min(calc(100svh-150px),760px)] lg:overflow-y-auto">
            {currentPlayer && (
              <div className="panel shrink-0 p-5">
                <AuctionControls
                  player={currentPlayer}
                  teams={teamsByName}
                  onPlaceBid={handlePlaceBid}
                  onPassPlayer={handlePassPlayer}
                  playerLimits={{ Bowler: playersPerTeam, Batter: playersPerTeam, 'All-Rounder': playersPerTeam }}
                  bidLoading={bidLoading}
                />
              </div>
            )}
            {recentlySoldPlayer && (
              <RecentlySoldWidget player={recentlySoldPlayer} teams={teams} onBidUpdated={load} />
            )}
          </aside>
        </div>

        {/* Queue: one rail per category, tap a tile to put that player on the block. */}
        <section aria-label="Up next" className="mt-10 space-y-8">
          {CATEGORIES.map(category => {
            const list = queue(category);
            if (list.length === 0) return null;
            return (
              <div key={category}>
                <h3 className="mb-3 flex items-baseline gap-3 text-lg font-semibold text-ink">
                  {category}s up next <span className="text-sm font-normal text-soft">{list.length}</span>
                </h3>
                <ul className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto pb-2 md:scroll-px-8">
                  {list.map(player => (
                    <li key={player.id} className="w-[148px] shrink-0 snap-start sm:w-[168px]">
                      <button
                        type="button"
                        onClick={() => setCurrentId(player.id)}
                        className="group w-full overflow-hidden rounded-xl bg-surface text-left transition-colors hover:bg-raised"
                      >
                        <PlayerPhoto
                          src={player.image_url}
                          name={player.name}
                          className="aspect-[4/5] w-full"
                          imgClassName="transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                        />
                        <span className="block px-3 pb-3 pt-2">
                          <span className="block truncate text-sm font-semibold text-ink">{player.name}</span>
                          <span className="text-sm text-soft">{player.base_price} Cr · {player.points} pts</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section aria-label="Squads" className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-ink">Squads</h3>
              <p className="mt-1 text-sm text-soft">
                Tap a team to see its squad. Dots show filled and open slots per category.
              </p>
            </div>
          </div>
          {teams.length === 0 ? (
            <p className="rounded-xl bg-surface p-6 text-soft">No teams yet. Create them on the Teams page.</p>
          ) : (
            <SquadBoard teams={teamsByName} playersPerTeam={playersPerTeam} initialPurse={initialPurse} />
          )}
        </section>
      </div>
    </ErrorBoundary>
  );
};

const AuctionRoomSkeleton = () => (
  <div className="mx-auto max-w-[1600px] px-4 pt-4 md:px-8" aria-busy="true" aria-label="Loading the auction">
    <div className="mb-4 flex items-center justify-between">
      <div className="skeleton h-9 w-48 rounded-lg" />
      <div className="skeleton h-10 w-72 rounded-lg" />
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="skeleton aspect-[4/5] rounded-[18px] md:aspect-auto md:h-[min(calc(100svh-150px),760px)]" />
      <div className="space-y-4">
        <div className="skeleton h-[340px] rounded-[18px]" />
        <div className="skeleton h-[260px] rounded-[18px]" />
      </div>
    </div>
  </div>
);

export default AuctionRoom;

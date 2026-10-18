import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PlayerCard, { Player } from '@/components/PlayerCard';
import PlayerPhoto from '@/components/PlayerPhoto';
import TeamCard, { Team } from '@/components/TeamCard';
import Pager, { usePaged } from '@/components/Pager';
import LedTicker from '@/components/LedTicker';
import { rankLabel, rankTeams } from '@/lib/ranking';
import Podium from '@/components/Podium';
import { fetchPublicAuctionData } from '@/services/teamService';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type StatusFilter = 'All' | 'Sold' | 'Unsold';
type CategoryFilter = 'All' | 'Batter' | 'Bowler' | 'All-Rounder';

interface CommentaryLine {
  id: string;
  title: string;
  quote: string;
  time: Date;
}

// Highest-priority pick, then most points, then the biggest spend.
const bestBuy = (players: Player[] = []) =>
  [...players].sort((a, b) =>
    a.priority - b.priority || b.points - a.points || (b.bid_price || 0) - (a.bid_price || 0),
  )[0] ?? null;

const PublicAuctionView = () => {
  const { toast } = useToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [initialPurse, setInitialPurse] = useState(50);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('standings');

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [commentary, setCommentary] = useState<CommentaryLine[]>([]);
  const catalogTop = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [auction, settings] = await Promise.all([
      fetchPublicAuctionData(),
      supabase.from('settings').select('initial_purse').limit(1).maybeSingle(),
    ]);
    if (auction.error) {
      toast({ title: 'Could not load the auction', description: auction.error.message, variant: 'destructive' });
    } else {
      setPlayers(auction.players);
      setTeams([...auction.teams].sort((a, b) => b.points - a.points || b.purse - a.purse));
    }
    if (settings.data) setInitialPurse(Number(settings.data.initial_purse) || 50);
    setLoading(false);
  }, [toast]);

  // A sale touches several rows at once; one reload per burst.
  const reloadTimer = useRef<number>();
  const scheduleReload = useCallback(() => {
    window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(load, 300);
  }, [load]);

  useEffect(() => {
    load();

    const db = supabase.channel('public-view-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_players' }, scheduleReload)
      .subscribe();

    const events = supabase.channel('auction-events')
      .on('broadcast', { event: 'AI_MEME' }, ({ payload }) => {
        const line = { id: crypto.randomUUID(), title: payload.title, quote: payload.text, time: new Date() };
        setCommentary(prev => [line, ...prev].slice(0, 50));
        toast({ title: payload.title, description: payload.text, duration: 7000 });
      })
      .on('broadcast', { event: 'REFRESH' }, scheduleReload)
      .on('broadcast', { event: 'AUCTION_COMPLETE' }, scheduleReload)
      .subscribe();

    // Safety net if the socket drops on a phone that went to sleep.
    const poll = window.setInterval(load, 60000);

    return () => {
      window.clearTimeout(reloadTimer.current);
      window.clearInterval(poll);
      supabase.removeChannel(db);
      supabase.removeChannel(events);
    };
  }, [load, scheduleReload, toast]);

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return players.filter(p =>
      (!q || p.name.toLowerCase().includes(q)) &&
      (categoryFilter === 'All' || p.category === categoryFilter) &&
      (statusFilter === 'All' || (statusFilter === 'Sold' ? p.sold : !p.sold)),
    );
  }, [players, searchQuery, categoryFilter, statusFilter]);

  const paged = usePaged(filteredPlayers, 12, `${searchQuery}|${categoryFilter}|${statusFilter}`);
  const sold = players.filter(p => p.sold).length;
  const ranked = useMemo(() => rankTeams(teams), [teams]);
  const podium = ranked.filter(t => t.rank !== null).slice(0, 3);
  const rest = ranked.slice(podium.length);

  const tickerItems = useMemo(() => {
    const soldPlayers = players.filter(p => p.sold);
    if (soldPlayers.length === 0) {
      return ['Auction starting soon', `${players.length} players`, `${teams.length} franchises`];
    }
    return [
      ...soldPlayers.map(p => `${p.name} → ${p.sold_to} · ${p.bid_price} Cr`),
      `${players.length - soldPlayers.length} players still to go`,
    ];
  }, [players, teams.length]);

  return (
    <div className="min-h-[100svh]">
      <header className="relative z-40 px-3 pt-3 md:px-6">
        <div className="floating-bar mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-4 px-4 md:px-5">
          <Link to="/" className="flex items-center gap-3 rounded-lg">
            <img src="/icons/logo.png" alt="" className="h-8 w-auto" />
            <span className="hidden text-[15px] font-semibold text-ink sm:inline">Campus Premier League</span>
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral" />
            </span>
            Live
          </span>
        </div>
      </header>

      {!loading && <LedTicker items={tickerItems} className="w-full" />}

      <div className="mx-auto max-w-[1320px] px-4 pb-20 pt-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-header text-3xl md:text-4xl">Auction live</h1>
            <p className="mt-1 text-ink">
              {loading ? 'Loading the auction…' : `${sold} of ${players.length} players sold · ${teams.length} franchises`}
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-surface p-1 sm:flex sm:justify-start">
            {[
              { value: 'standings', label: 'Standings' },
              { value: 'rosters', label: 'Rosters' },
              { value: 'players', label: 'Players' },
              { value: 'commentary', label: `Commentary${commentary.length ? ` · ${commentary.length}` : ''}` },
            ].map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-lg px-4 py-2 text-[15px] text-soft data-[state=active]:bg-raised data-[state=active]:font-semibold data-[state=active]:text-ink"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Standings */}
          <TabsContent value="standings" className="mt-0">
            {loading ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[0, 1, 2].map(i => <div key={i} className="skeleton h-56 rounded-[18px]" />)}
              </div>
            ) : teams.length === 0 ? (
              <EmptyState title="No franchises yet" body="Teams appear here as soon as the organiser adds them." />
            ) : (
              <div className="space-y-8">
                <Podium teams={podium} />

                {rest.length > 0 && (
                  <div className="overflow-x-auto rounded-[18px] bg-surface">
                    <table className="w-full text-left text-[15px]">
                      <thead className="text-sm text-soft">
                        <tr>
                          <th className="px-5 py-3 font-medium">#</th>
                          <th className="px-5 py-3 font-medium">Franchise</th>
                          <th className="hidden px-5 py-3 text-right font-medium sm:table-cell">Players</th>
                          <th className="px-5 py-3 text-right font-medium">Purse left</th>
                          <th className="px-5 py-3 text-right font-medium">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rest.map(team => (
                          <tr key={team.id} className="border-t border-line">
                            <td className="px-5 py-4 text-soft">{rankLabel(team.rank)}</td>
                            <td className="px-5 py-4">
                              <span className="block font-medium text-ink">{team.name}</span>
                              {team.rank === null && <span className="text-sm text-soft">Yet to open the purse</span>}
                            </td>
                            <td className="hidden px-5 py-4 text-right text-ink sm:table-cell">{team.players?.length ?? 0}</td>
                            <td className="px-5 py-4 text-right text-ink">{team.purse} Cr</td>
                            <td className="px-5 py-4 text-right font-semibold text-ink">{team.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Rosters */}
          <TabsContent value="rosters" className="mt-0">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map(i => <div key={i} className="skeleton h-72 rounded-[14px]" />)}
              </div>
            ) : teams.length === 0 ? (
              <EmptyState title="No franchises yet" body="Rosters fill in as players are sold." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map(team => (
                  <TeamCard key={team.id} team={team} initialPurse={initialPurse} showPlayers isPublicView />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Players */}
          <TabsContent value="players" className="mt-0">
            <div ref={catalogTop} className="mb-5 flex scroll-mt-24 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Segmented
                  label="Category"
                  value={categoryFilter}
                  onChange={v => setCategoryFilter(v as CategoryFilter)}
                  options={[['All', 'All'], ['Batter', 'Batters'], ['Bowler', 'Bowlers'], ['All-Rounder', 'All-rounders']]}
                />
                <Segmented
                  label="Status"
                  value={statusFilter}
                  onChange={v => setStatusFilter(v as StatusFilter)}
                  options={[['All', 'All'], ['Sold', 'Sold'], ['Unsold', 'Unsold']]}
                />
              </div>
              <div className="relative w-full lg:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
                <Input
                  type="search"
                  placeholder="Search players"
                  aria-label="Search players"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="glass-input h-10 rounded-lg pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[4/6] rounded-[14px]" />)}
              </div>
            ) : paged.total === 0 ? (
              <EmptyState title="No players match" body="Try another name, category or status." />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {paged.pageItems.map((player, i) => (
                    <PlayerCard key={player.id} player={player} showActions={false} priority={i < 4} />
                  ))}
                </div>
                <Pager
                  className="mt-6"
                  page={paged.page}
                  pageCount={paged.pageCount}
                  total={paged.total}
                  pageSize={paged.pageSize}
                  onPage={p => { paged.setPage(p); catalogTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                />
              </>
            )}
          </TabsContent>

          {/* Commentary */}
          <TabsContent value="commentary" className="mt-0">
            {commentary.length === 0 ? (
              <EmptyState title="Waiting for the first sale" body="Each sale, pass and release posts a Telugu commentary line here as it happens. Keep this tab open." />
            ) : (
              <ol className="max-w-2xl space-y-3" aria-live="polite">
                {commentary.map(line => (
                  <li key={line.id} className="rounded-[18px] bg-surface px-5 py-4">
                    <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
                      <span className="font-semibold text-tan">{line.title}</span>
                      <time className="shrink-0 text-soft">
                        {line.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    <p className="text-lg text-ink">{line.quote}</p>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const Segmented = ({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) => (
  <div className="flex rounded-lg bg-surface p-1" role="radiogroup" aria-label={label}>
    {options.map(([v, text]) => (
      <button
        key={v}
        type="button"
        role="radio"
        aria-checked={value === v}
        onClick={() => onChange(v)}
        className={cn('rounded-md px-3 py-1.5 text-sm transition-colors', value === v ? 'bg-raised font-semibold text-ink' : 'text-soft hover:text-ink')}
      >
        {text}
      </button>
    ))}
  </div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-[18px] bg-surface px-6 py-16 text-center">
    <h3 className="text-lg font-semibold text-ink">{title}</h3>
    <p className="mx-auto mt-1 max-w-md text-soft">{body}</p>
  </div>
);

export default PublicAuctionView;

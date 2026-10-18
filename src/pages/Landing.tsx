import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchPublicAuctionData } from '@/services/teamService';
import PlayerPhoto from '@/components/PlayerPhoto';
import { CategoryMark, type Player } from '@/components/PlayerCard';
import type { Team } from '@/components/TeamCard';
import Telestrator from '@/components/Telestrator';
import LedTicker from '@/components/LedTicker';
import CommentaryFeed from '@/components/CommentaryFeed';
import Wordmark from '@/components/Wordmark';
import BiddingWar from '@/components/BiddingWar';
import ScrollRail from '@/components/ScrollRail';
import { MEMES_20_CR, MEMES_STRATEGY, MEMES_STEAL, MEMES_UNSOLD, MEMES_MADNESS } from '@/data/memes';
import { cn } from '@/lib/utils';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] } }),
};

const Reveal = ({ children, i = 0, className }: { children: React.ReactNode; i?: number; className?: string }) => (
  <motion.div variants={rise} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className={className}>
    {children}
  </motion.div>
);

// The library carries an English gloss in brackets; the card shows the Telugu line.
const PUNCHLINES = [MEMES_20_CR[0], MEMES_STRATEGY[0], MEMES_STEAL[1], MEMES_UNSOLD[0], MEMES_MADNESS[1]]
  .map(line => line.replace(/\s*\(.*?\)\s*$/, '').trim());

// A peach card that swaps one commentary line every few seconds.
const PunchlineCard = () => {
  const reduceMotion = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => setI(n => (n + 1) % PUNCHLINES.length), 3200);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <div className="flex h-full min-h-[200px] flex-col justify-between rounded-[28px] bg-[#fbe3c6] p-7 md:p-8">
      <p className="dot-label text-[12px] text-[#8a4b12]">Commentary · after every hammer</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.35 }}
          className="mt-5 font-display text-[clamp(1.4rem,2.2vw,1.9rem)] leading-tight text-ink"
        >
          “{PUNCHLINES[i]}”
        </motion.p>
      </AnimatePresence>
      <p className="mt-5 text-sm text-[#6b4a2a]">Telugu one-liners, live on every phone in the room.</p>
    </div>
  );
};

const Landing = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [initialPurse, setInitialPurse] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => {
    Promise.all([
      fetchPublicAuctionData(),
      supabase.from('settings').select('initial_purse').limit(1).maybeSingle(),
    ]).then(([auction, settings]) => {
      setPlayers(auction.players);
      setTeams(auction.teams);
      setInitialPurse(settings.data ? Number(settings.data.initial_purse) : null);
      setLoading(false);
    });
  }, []);

  const withPhotos = useMemo(() => players.filter(p => p.image_url), [players]);
  const featured = useMemo(() => withPhotos.slice(0, 7), [withPhotos]);
  const activePlayer = featured[active];
  const totalPurse = initialPurse !== null ? initialPurse * teams.length : null;
  // The perimeter board: every sale so far, then what is still to come.
  const tickerItems = useMemo(() => {
    const sales = players
      .filter(p => p.sold && p.sold_to)
      .map(p => `${p.name} → ${p.sold_to} · ${p.bid_price} Cr`);
    return sales.length
      ? [...sales, `${players.length - sales.length} players still to go`]
      : [`${players.length} players`, `${teams.length} franchises`, 'Hammer goes down live'];
  }, [players, teams.length]);

  return (
    <div id="top" className="text-ink">
      {/* Header: one page, so the links travel down it. */}
      <header className="relative z-40 px-3 pt-3 md:px-6">
        <div className="floating-bar mx-auto flex max-w-[1256px] items-center justify-between gap-4 py-2.5 pl-4 pr-2.5 md:pl-5">
          <a href="#top" className="flex items-center gap-3 rounded-lg">
            <img src="/icons/logo.png" alt="" className="h-9 w-auto" />
            <span className="text-[15px] font-semibold">Campus Premier League</span>
          </a>
          <nav className="hidden items-center gap-1 text-[15px] lg:flex" aria-label="Sections">
            {[
              ['#how', 'How it works'],
              ['#players', 'Players'],
              ['#purse', 'The purse'],
              ['#teams', 'Franchises'],
              ['#commentary', 'Commentary'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 text-soft transition-colors hover:bg-white hover:text-ink">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-lg px-3 py-2 text-[15px] font-medium text-ink transition-colors hover:bg-white sm:inline-block">Sign in</Link>
            <Link to="/public" className="primary-button inline-flex min-h-0 items-center gap-2 px-4 py-2 text-[15px]">Watch live</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1320px] px-4 pb-14 pt-6 md:px-8 md:pt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* The pitch */}
          <Reveal className="h-full">
            <div className="relative flex h-full min-h-[460px] flex-col justify-between overflow-hidden rounded-[28px] bg-tan p-8 text-white md:p-12">
              <div>
                <p className="dot-label text-[13px] text-white/85">Campus Premier League · Player auction</p>
                <h1 className="mt-6 font-display" style={{ fontSize: 'clamp(2.6rem, 5.4vw, 5.25rem)' }}>
                  The auction,<br />
                  <Telestrator mark="underline" trigger="mount" delay={0.5} colour="#ffb547">live.</Telestrator>
                </h1>
                <p className="mt-6 max-w-[40ch] text-lg text-white/90 md:text-xl">
                  Paddles up, purses on the line and the whole college watching. Every bid hits the big screen, every sale hits your phone.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link to="/public" className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-white px-6 font-semibold text-tan transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]">
                  Watch it live <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className="inline-flex h-12 items-center rounded-[14px] px-5 font-semibold text-white ring-1 ring-white/50 transition-colors hover:bg-white/10">
                  I'm running it
                </Link>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-4">
            {/* The board */}
            <Reveal i={1}>
              <div
                className="led rounded-[28px] p-7 md:p-8"
                style={{ backgroundImage: 'radial-gradient(rgb(255 181 71 / 0.07) 1.2px, transparent 1.6px)', backgroundSize: '10px 10px' }}
              >
                <BiddingWar bare />
              </div>
            </Reveal>
            {/* The voice */}
            <Reveal i={2}>
              <PunchlineCard />
            </Reveal>
          </div>
        </div>

        {/* The facts, one strip */}
        <Reveal i={3}>
          <dl className="mt-4 grid overflow-hidden rounded-[28px] border border-line bg-surface sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Format', value: 'Live player auction', note: 'One lot at a time, on the big screen' },
              { label: 'Purse', value: initialPurse !== null ? `${initialPurse} Cr` : '—', note: 'per franchise, not a crore more' },
              { label: 'Franchises', value: teams.length ? `${teams.length} teams` : '—', note: 'Batters, bowlers, all-rounders' },
              { label: 'Watch', value: 'Any phone', note: 'No app, no sign-up, just the link' },
            ].map(({ label, value, note }, i) => (
              <div key={label} className={cn('p-6 md:p-7', i > 0 && 'border-t border-line sm:border-t-0', i % 2 === 1 && 'sm:border-l', i === 2 && 'lg:border-l', i >= 2 && 'sm:border-t lg:border-t-0')}>
                <dt className="dot-label text-[12px] text-soft">{label}</dt>
                <dd className="mt-3 font-display text-2xl text-ink">{value}</dd>
                <dd className="mt-1 text-sm text-soft">{note}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {!loading && <LedTicker items={tickerItems} />}

      {/* How the night works: the game in three moves. */}
      <section id="how" className="mx-auto max-w-[1320px] scroll-mt-20 px-5 py-20 md:px-10 lg:py-28">
        <Reveal>
          <h2 className="page-header" style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)' }}>How the night works</h2>
        </Reveal>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { word: 'Up', tone: 'bg-[#f8e0d9]', title: 'A player takes the block', body: 'Name, photo, points and base price go up on the big screen for the whole room.' },
            { word: 'Bid', tone: 'bg-[#fff1e3]', title: 'Franchises fight for them', body: `Seven teams, ${initialPurse ?? '—'} Cr each, and only so many batters, bowlers and all-rounders per squad.` },
            { word: 'Sold', tone: 'bg-[#e8f4ea]', title: 'The hammer comes down', body: 'Purses, rosters and standings update on every phone, with a Telugu line for the moment.' },
          ].map(({ word, tone, title, body }, i) => (
            <Reveal key={word} i={i}>
              <li className={cn('group flex h-full flex-col justify-between gap-10 rounded-[20px] p-7 transition-transform duration-300 hover:-translate-y-1 hover:-rotate-1 motion-reduce:hover:transform-none', tone)}>
                <p className="figure text-[#7a1d24]" style={{ fontSize: 'clamp(3.5rem, 6vw, 5.5rem)' }}>{word}</p>
                <div>
                  <h3 className="text-xl font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-ink">{body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* On the block: sticky photo, active list */}
      {featured.length > 0 && (
        <section id="players" className="scroll-mt-16 bg-white/45">
          <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-20 md:px-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 lg:py-28">
            <div className="lg:sticky lg:top-[12vh] lg:self-start">
              <PlayerPhoto
                src={activePlayer?.image_url}
                name={activePlayer?.name ?? ''}
                fit="stage"
                className="aspect-[4/3] w-full rounded-[20px] lg:aspect-[4/5]"
              />
            </div>
            <div>
              <Reveal>
                <h2 className="page-header" style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)' }}>Who takes the block</h2>
              </Reveal>
              <Reveal i={1}>
                <p className="mt-3 max-w-[48ch] text-ink">The first names up, in auction order. Base prices are where the bidding starts.</p>
              </Reveal>
              <ul className="mt-8">
                {featured.map((player, i) => (
                  <li key={player.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setActive(i)}
                      className={cn(
                        'flex w-full items-center justify-between gap-4 rounded-xl px-4 py-4 text-left transition-colors',
                        i === active ? 'bg-raised' : 'hover:bg-stage',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <CategoryMark category={player.category} short />
                        <span className={cn('truncate text-lg md:text-xl', i === active ? 'font-semibold text-ink' : 'text-soft')}>{player.name}</span>
                      </span>
                      <span className="shrink-0 text-[15px] text-soft">
                        {player.sold ? <span className="font-semibold text-tan">Sold · {player.bid_price} Cr</span> : `${player.base_price} Cr base`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Link to="/public" className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-3 font-medium text-tan transition-colors hover:bg-raised">
                All {players.length} players <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* One figure owns the screen */}
      <section id="purse" className="mx-auto flex max-w-[1320px] scroll-mt-16 flex-col justify-between gap-10 px-5 py-20 md:px-10 lg:min-h-[80svh] lg:gap-16 lg:py-28">
        <Reveal>
          <h2 className="page-header" style={{ fontSize: 'clamp(1.75rem, 2.8vw, 2.5rem)' }}>In the room tonight</h2>
        </Reveal>
        <Reveal i={1}>
          <p className="figure text-ink" style={{ fontSize: 'clamp(7rem, 23vw, 22rem)' }}>
            {totalPurse ?? '—'}
            <span className="ml-2 align-top text-[0.33em] text-tan">Cr</span>
          </p>
          <p className="mt-6 max-w-[34ch] text-lg text-ink">
            {teams.length} franchises with {initialPurse ?? '—'} Cr each. Every bid comes out of a purse, and every purse is on screen.
          </p>
        </Reveal>
      </section>

      {/* The pool: a band of the real photos */}
      {withPhotos.length > 4 && (
        <ScrollRail
          players={withPhotos.slice(7, 21)}
          title="Who's in the pool"
          subtitle="Keep scrolling. Batters, bowlers and all-rounders, all waiting for a paddle to go up."
        />
      )}

      {/* Franchises */}
      {teams.length > 0 && (
        <section id="teams" className="scroll-mt-16 bg-white/45">
          <div className="mx-auto max-w-[1320px] px-5 py-20 md:px-10 lg:py-28">
            <Reveal>
              <h2 className="page-header" style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)' }}>The franchises</h2>
            </Reveal>
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team, i) => (
                <Reveal key={team.id} i={i % 3}>
                  <li className="flex items-baseline justify-between gap-4 rounded-[18px] bg-stage px-5 py-5">
                    <span className="min-w-0">
                      <span className="block truncate text-xl font-semibold">{team.name}</span>
                      <span className="text-sm text-soft">{team.players?.length ?? 0} {(team.players?.length ?? 0) === 1 ? 'player' : 'players'} · {team.points} pts</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="figure block text-3xl">{team.purse}</span>
                      <span className="text-sm text-soft">Cr left</span>
                    </span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Commentary */}
      <section id="commentary" className="mx-auto max-w-[1320px] scroll-mt-16 px-5 py-20 md:px-10 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
          <Reveal>
            <h2 className="page-header" style={{ fontSize: 'clamp(1.9rem, 3vw, 2.75rem)' }}>
              Every hammer gets a punchline
            </h2>
            <p className="mt-5 max-w-[44ch] text-lg text-ink">
              The moment a player is sold, passed or released, a Telugu one-liner lands on every phone in the room, written for that player, that team and that price.
            </p>
            <ul className="mt-8 space-y-3 text-ink">
              {[
                'Sold, unsold, released and corrected calls each get their own voice.',
                'Lines arrive within a second of the hammer.',
                'Spectators need nothing but the link.',
              ].map(point => (
                <li key={point} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-tan" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link to="/public" className="primary-button mt-8 inline-flex items-center gap-2 px-6">
              Open the live feed <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <Reveal i={1}>
            <CommentaryFeed />
          </Reveal>
        </div>
      </section>

      {/* Footer: one last pitch, the links, and the name as large as the page allows. */}
      <footer className="overflow-hidden bg-tan text-[#fbf3e8]">
        <div className="mx-auto max-w-[1320px] px-5 pt-16 md:px-10 md:pt-20">
          <div className="flex flex-col gap-8 border-b border-white/25 pb-12 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="dot-label text-[13px] text-[#ffd9a8]">Tonight's the night</p>
              <h2 className="mt-4 font-display text-[#fbf3e8]" style={{ fontSize: 'clamp(2.25rem, 4.6vw, 4.25rem)' }}>
                The hammer's waiting.
              </h2>
            </div>
            <Link to="/public" className="inline-flex h-14 shrink-0 items-center gap-2 self-start rounded-[16px] bg-[#fbf3e8] px-7 text-lg font-semibold text-tan transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] md:self-auto">
              Watch it live <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="grid gap-10 py-12 sm:grid-cols-3">
            {[
              { title: 'Follow', links: [['Live auction', '/public'], ['Standings', '/public'], ['Commentary feed', '/public']] },
              { title: 'On this page', links: [['How it works', '#how'], ['Players', '#players'], ['Franchises', '#teams']] },
              { title: 'Organisers', links: [['Sign in', '/login'], ['Run the auction', '/login']] },
            ].map(({ title, links }) => (
              <nav key={title} aria-label={title}>
                <p className="dot-label text-[12px] text-[#ffd9a8]">{title}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith('#')
                        ? <a href={href} className="text-lg text-[#fbf3e8]/90 transition-colors hover:text-white">{label}</a>
                        : <Link to={href} className="text-lg text-[#fbf3e8]/90 transition-colors hover:text-white">{label}</Link>}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <Wordmark className="px-3 text-[#fbf3e8]" shadowColour="#7a1d24" />
      </footer>
    </div>
  );
};

export default Landing;

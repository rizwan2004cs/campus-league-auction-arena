import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { Loader2, ArrowRight } from 'lucide-react';
import LedTicker from '@/components/LedTicker';
import Telestrator from '@/components/Telestrator';
import BiddingWar from '@/components/BiddingWar';

const BOARD_TILES = [
  { label: 'Tonight', value: 'Live auction night' },
  { label: 'Commentary', value: 'Telugu, every hammer' },
  { label: 'Spectators', value: 'Any phone, no app' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const from = location.state?.from || '/dashboard';

  // This page draws its own crest; the global batter watermark would double it.
  useEffect(() => {
    document.documentElement.dataset.page = 'bare';
    return () => { delete document.documentElement.dataset.page; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      // useAuth already shows the error toast.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100svh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Paper side: the paddle and the form. */}
      <div className="relative flex flex-col overflow-hidden px-5 py-6 sm:px-10">
        <img
          src="/icons/logo.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-[1] h-[100vh] w-auto -translate-x-1/2 -translate-y-1/2 opacity-[0.06]"
        />

        <Link to="/" className="inline-flex items-center gap-3 self-start rounded-lg">
          <img src="/icons/logo.png" alt="" className="h-9 w-auto" />
          <span className="text-[15px] font-semibold text-ink">Campus Premier League</span>
        </Link>

        <main className="flex flex-1 items-center justify-center pb-6 pt-24">
          <motion.div
            initial={reduceMotion ? false : { y: 24, opacity: 0, rotate: -2 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', bounce: 0.35, duration: 0.7 }}
            className="relative w-full max-w-[420px]"
          >
            {/* The paddle head */}
            <motion.div
              initial={reduceMotion ? false : { scale: 0.6, rotate: -14 }}
              animate={{ scale: 1, rotate: -6 }}
              transition={{ type: 'spring', bounce: 0.55, duration: 0.8, delay: 0.15 }}
              whileHover={reduceMotion ? undefined : { rotate: 4, scale: 1.04 }}
              className="absolute -top-16 left-1/2 z-[1] -ml-[64px] grid h-[128px] w-[128px] place-items-center rounded-full bg-tan text-white shadow-[0_18px_40px_-18px_rgb(209_52_62/0.9)] ring-[6px] ring-stage"
            >
              <div className="text-center">
                <p className="dot text-[48px] leading-none">00</p>
                <p className="dot-label mt-1 text-[11px] text-white/85">Organiser</p>
              </div>
            </motion.div>

            <div className="panel overflow-hidden pt-20">
              <div className="px-7 pb-7 sm:px-9">
                <h1 className="text-center font-display text-ink" style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.4rem)' }}>
                  Take the <Telestrator mark="underline" trigger="mount" delay={0.6}>gavel.</Telestrator>
                </h1>
                <p className="mt-3 text-center text-soft">Sign in to run tonight's auction.</p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-ink">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@college.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input h-12 rounded-xl px-4 text-base"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-ink">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input h-12 rounded-xl px-4 text-base"
                      required
                    />
                  </div>

                  <button type="submit" disabled={loading} className="primary-button !mt-6 inline-flex h-12 w-full items-center justify-center gap-2 text-base disabled:opacity-60">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in</> : 'Sign in'}
                  </button>
                </form>
              </div>

              {/* The tear-off stub */}
              <div className="relative border-t-2 border-dashed border-line bg-raised/60">
                <span aria-hidden className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-stage" />
                <span aria-hidden className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-stage" />
                <Link to="/public" className="group flex items-center justify-between gap-4 px-7 py-5 sm:px-9">
                  <span>
                    <span className="dot-label block text-[11px] text-soft">Spectator stub</span>
                    <span className="mt-1 block font-semibold text-ink">Just watching? Join the stands</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-tan transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Scoreboard side: the night, told the way the ground's board tells it. */}
      <div
        className="relative hidden flex-col overflow-hidden bg-[var(--c-board)] text-[var(--c-led)] lg:flex"
        style={{ backgroundImage: 'radial-gradient(rgb(255 181 71 / 0.07) 1.2px, transparent 1.6px)', backgroundSize: '12px 12px' }}
      >
        <LedTicker
          items={['Lot 08 · Bowler · Base 2 Cr', 'Lot 09 · All-rounder · Base 3 Cr', 'Lot 10 · Batter · Base 2 Cr', 'Paddles ready', 'Purses checked']}
          className="border-b border-white/10 bg-transparent"
          label="Coming up"
        />

        <div className="flex flex-1 flex-col justify-center gap-10 px-12 xl:px-16">
          <BiddingWar bare className="mx-auto max-w-[600px]" />

          <dl className="grid grid-cols-3 gap-3">
            {BOARD_TILES.map(({ label, value }, i) => (
              <motion.div
                key={label}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                className="rounded-2xl border border-[rgb(255_181_71/0.2)] p-4"
              >
                <dt className="dot-label text-[11px] opacity-70">{label}</dt>
                <dd className="mt-2 text-[15px] font-medium text-[#ece8df]" style={{ textShadow: 'none' }}>{value}</dd>
              </motion.div>
            ))}
          </dl>
        </div>

        <p
          aria-hidden
          className="wordmark -mb-[0.22em] select-none whitespace-nowrap px-6 text-tan"
          style={{ fontSize: '5.55vw', textShadow: '0.04em 0.04em 0 var(--c-led)' }}
        >
          Live auction
        </p>
      </div>
    </div>
  );
};

export default Login;

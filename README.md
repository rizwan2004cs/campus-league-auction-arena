# Campus Premier League · Player Auction

A live, IPL-style player auction for a college cricket league. The organiser runs the auction on a laptop that is also on the big screen; everyone else follows on their phones.

- **Auction room**: player on the block, one-tap bidder selection, atomic bids, SOLD celebration, last-sale correction, squad board
- **Live for spectators** (`/public`): podium standings, rosters, searchable player catalogue, LED ticker of sales
- **Telugu commentary**: every sold, unsold, released or corrected player gets an AI one-liner, pushed to every phone
- **Players and teams**: add players with photos, set purses and squad limits

Live: https://campus-league-auction-arena.vercel.app

**Stack**: Vite, React, TypeScript, Tailwind · Supabase (Postgres, Auth, Storage, Realtime) · Vercel (hosting, serverless functions, cron) · Groq (commentary)

---

## Deploy your own

Your copy gets its **own** database. It starts with the same 87 players and 7 franchises as the original (all unsold, full purses); change or delete them from the Players and Teams pages.

### 1. Create the database

1. Create a free project at [supabase.com](https://supabase.com).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from this folder:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push                                  # creates tables, bidding functions, security rules, photo bucket
   supabase db query --linked -f supabase/seed.sql   # loads the starting players, teams and settings
   supabase functions deploy reset-auction           # the "reset auction" button in Settings
   ```

3. In the Supabase dashboard, open **Authentication → Users → Add user** and create the organiser's email and password. (Turn off public sign-ups under **Authentication → Sign In / Providers** so nobody else can register.) The first time the organiser signs in, they take ownership of the seeded teams.

### 2. Deploy the site

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frizwan2004cs%2Fcampus-league-auction-arena&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,SUPABASE_URL,SUPABASE_ANON_KEY,GROQ_API_KEY&envDescription=Supabase%20URL%20and%20anon%20key%20(twice%3A%20browser%20and%20server)%2C%20plus%20a%20Groq%20API%20key%20for%20commentary&project-name=campus-league-auction)

The button forks the repo into your GitHub and asks for these values (Supabase → **Project Settings → API**):

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | your project URL, e.g. `https://abcd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` | your anon (publishable) key |
| `GROQ_API_KEY` | a key from [console.groq.com](https://console.groq.com). Optional: without it, commentary falls back to plain text |

Every push to `main` then redeploys production, and pull requests get preview links.

### Run it locally

```bash
cp .env.example .env    # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

AI commentary runs as a Vercel function, so locally it uses the plain-text fallback unless you run `vercel dev`.

---

## How it fits together

- `src/pages`: Landing (`/`), Login, Players, Teams, Auction, Summary, Settings, Public view
- `api/commentary.ts`: server-side Groq call (the key never reaches the browser), with a model fallback
- `api/cron/keep-alive.ts`: runs every 3 days so a free Supabase project never pauses
- `supabase/migrations`: the schema; `place_bid` / `release_player` move purse, points and roster in one locked transaction
- `supabase/seed.sql`: starting players, teams and settings
- `.github/workflows/ci.yml`: typecheck, build and API bundle check on every push and pull request

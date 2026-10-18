# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Auctioneer / organiser** (signed in): runs the live player auction for a college cricket league from a laptop that is also projected onto a screen or TV in the room. Adds players, sets up teams and purses, then sells players one by one to teams.
- **Spectators** (no login): students and team owners in the room or remote, following on their phones via `/public` and `/leaderboard`: who went where, for how much, which team leads.

## Product Purpose

Campus League Auction Arena runs an IPL-style player auction for a campus cricket league: a pool of players (Batter, Bowler, All-Rounder) with base prices, points and priority; teams with a purse in crores; a live auction that sells each player to a team, updates purses, points and rosters, and broadcasts the result to everyone watching. Success is an auction night that runs without mistakes or waiting and that the room enjoys watching.

## Positioning

A campus-scale IPL auction with Telugu meme commentary: every sale, unsold player, release or mistake triggers a Telugu meme line (Groq LLM over a curated meme library) pushed live to spectators.

## Operating Context

- Live event, one evening, in a room; the auctioneer's screen is projected, so the current player must read from across the room.
- Spectators are on phones and need live updates without refreshing.
- Corrections happen live (wrong team or price), so editing a recent sale must be quick.

## Capabilities and Constraints

- Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres, auth, storage bucket `player-images`, realtime), deployed on Vercel.
- Currency unit is crores ("Cr"); categories are Batter, Bowler, All-Rounder; per-team category limit comes from `settings.players_per_team`; starting purse from `settings.initial_purse`.
- Player photos are user-uploaded JPEGs of mixed aspect ratios (landscape, square and tall portrait). Supabase image transforms are not available on this plan.
- Around 87 players and 7 teams per event.

## Brand Commitments

- Name: Campus League (logo at `public/icons/logo.png`).
- Telugu meme voice in commentary and team-situation lines; keep the meme copy as written.

## Evidence on Hand

- Real player photos in Supabase storage; real team and player data in the live DB.
- No testimonials, sponsors or statistics to show; none should be invented.

## Product Principles

1. The room must read it: the current player, price and sale outcome are legible from a projector.
2. Never lose a rupee: purse, points and roster changes are atomic and correctable.
3. Live means live: spectators see sales without refreshing.
4. Fun is in the commentary, not in chrome.

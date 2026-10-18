import type { Team } from '@/components/TeamCard';

export type RankedTeam = Team & {
  /** Competition rank (1, 2, 2, 4…); null while the team has signed nobody. */
  rank: number | null;
  prioritySum: number;
};

const prioritySum = (team: Team) => (team.players ?? []).reduce((sum, p) => sum + (p.priority || 0), 0);

/**
 * One ranking for every screen. Points decide the rank; teams level on points
 * share it. Inside a tie, the stronger picks (lower priority sum) and then the
 * bigger purse decide the order. A team with no players has no rank yet.
 */
export const rankTeams = (teams: Team[]): RankedTeam[] => {
  const sorted = teams
    .map(team => ({ ...team, prioritySum: prioritySum(team), rank: null as number | null }))
    .sort((a, b) => {
      const aEmpty = !(a.players?.length), bEmpty = !(b.players?.length);
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
      return b.points - a.points || a.prioritySum - b.prioritySum || b.purse - a.purse || a.name.localeCompare(b.name);
    });

  sorted.forEach((team, i) => {
    if (!team.players?.length) return;
    const prev = sorted[i - 1];
    team.rank = prev && prev.rank !== null && prev.points === team.points ? prev.rank : i + 1;
  });

  return sorted;
};

export const rankLabel = (rank: number | null) => (rank === null ? '—' : String(rank));

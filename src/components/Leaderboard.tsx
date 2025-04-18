
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Team } from './TeamCard';
import { ChevronsUp, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { Player } from './PlayerCard';

interface LeaderboardProps {
  teams: Team[];
}

interface RankedTeam extends Team {
  playerNames: string[];
  prioritySum: number;
}

const Leaderboard = ({ teams }: LeaderboardProps) => {
  const [rankedTeams, setRankedTeams] = useState<RankedTeam[]>([]);

  useEffect(() => {
    const fetchTeamPlayers = async () => {
      const rankedTeamsWithDetails = await Promise.all(teams.map(async (team) => {
        // Fetch players for each team
        const { data: teamPlayers, error } = await supabase
          .from('team_players')
          .select(`
            players:player_id (name, priority)
          `)
          .eq('team_id', team.id);

        if (error) {
          console.error('Error fetching team players:', error);
          return {
            ...team,
            playerNames: [],
            prioritySum: 0
          };
        }

        const playerNames = teamPlayers.map(tp => tp.players?.name || '').filter(Boolean);
        const prioritySum = teamPlayers.reduce((sum, tp) => sum + (tp.players?.priority || 0), 0);

        return {
          ...team,
          playerNames,
          prioritySum
        };
      }));

      // Custom ranking logic
      const sortedTeams = rankedTeamsWithDetails.sort((a, b) => {
        // First, compare by points
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        
        // If points are equal, compare by priority sum
        if (b.prioritySum !== a.prioritySum) {
          return a.prioritySum - b.prioritySum;
        }
        
        // If priority sums are equal, compare by remaining purse
        return b.purse - a.purse;
      });

      setRankedTeams(sortedTeams);
    };

    fetchTeamPlayers();
  }, [teams]);

  return (
    <div className="card-with-shadow">
      <div className="flex items-center space-x-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">Leaderboard</h3>
      </div>
      
      {teams.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No teams available</p>
          <p className="text-sm">Add teams to see the leaderboard</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">Purse Left</TableHead>
                <TableHead>Players</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedTeams.map((team, index) => (
                <TableRow key={team.id} className={index === 0 ? "font-medium" : ""}>
                  <TableCell className="text-center">
                    {index === 0 ? (
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-yellow-100 text-yellow-700">
                        1
                      </span>
                    ) : (
                      index + 1
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell className="text-right">
                    {team.points}
                    {index === 0 && <ChevronsUp className="inline-block h-4 w-4 text-green-600 ml-1" />}
                  </TableCell>
                  <TableCell className="text-right">{team.purse} Cr</TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {team.playerNames.length > 0 
                        ? team.playerNames.join(', ') 
                        : 'No players'}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;

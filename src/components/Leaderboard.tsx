import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Team } from './TeamCard';
import { ChevronsUp, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardProps {
  teams: Team[];
}

interface PlayerData {
  name: string;
  priority: number;
}

// This defines the structure of the data as it actually comes from Supabase
interface TeamPlayerResponse {
  player_id: string;
  players: {
    name: string;
    priority: number;
  };
}

interface RankedTeam extends Team {
  playerNames: string[];
  prioritySum: number;
}

const Leaderboard = ({ teams }: LeaderboardProps) => {
  const [rankedTeams, setRankedTeams] = useState<RankedTeam[]>([]);
  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchTeamPlayers = async () => {
      const rankedTeamsWithDetails = await Promise.all(teams.map(async (team) => {
        const { data: teamPlayers, error } = await supabase
          .from('team_players')
          .select(`
            player_id,
            players (name, priority)
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

        const playerNames: string[] = [];
        let prioritySum = 0;
        
        // Properly type the response from Supabase
        (teamPlayers as unknown as TeamPlayerResponse[]).forEach(tp => {
          if (tp.players) {
            playerNames.push(tp.players.name || '');
            prioritySum += tp.players.priority || 0;
          }
        });

        return {
          ...team,
          playerNames,
          prioritySum
        };
      }));

      // Save previous ranks before sorting
      const currentRanks = rankedTeamsWithDetails.reduce((acc, team, index) => {
        acc[team.id] = index;
        return acc;
      }, {} as Record<string, number>);

      const sortedTeams = rankedTeamsWithDetails.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        
        if (a.prioritySum !== b.prioritySum) {
          return a.prioritySum - b.prioritySum;
        }
        
        return b.purse - a.purse;
      });

      setPrevRanks(currentRanks);
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
              <AnimatePresence>
                {rankedTeams.map((team, index) => {
                  const hasMovedUp = prevRanks[team.id] > index;
                  const hasMovedDown = prevRanks[team.id] < index;
                  
                  return (
                    <motion.tr
                      key={team.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: hasMovedUp ? [1, 1.02, 1] : 1,
                        background: hasMovedUp ? ['#fff', '#f0fdf4', '#fff'] : '#fff'
                      }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className={index === 0 ? "font-medium" : ""}
                    >
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
                        <div className="flex items-center justify-end">
                          {team.points}
                          {hasMovedUp && (
                            <motion.div
                              initial={{ opacity: 0, y: 2 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronsUp className="inline-block h-4 w-4 text-green-600 ml-1" />
                            </motion.div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{team.purse} Cr</TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {team.playerNames.length > 0 
                            ? team.playerNames.join(', ') 
                            : 'No players'}
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;

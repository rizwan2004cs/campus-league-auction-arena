import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Team } from './TeamCard';
import { ChevronsUp, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardProps {
  teams: Team[];
  startIndex?: number;
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

const Leaderboard = ({ teams, startIndex = 1 }: LeaderboardProps) => {
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
    <div className="glass-card flex flex-col max-h-[500px]">
      <div className="gradient-header px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <h3 className="font-display font-bold text-sm text-[#1e293b]">Leaderboard</h3>
      </div>
      
      {teams.length === 0 ? (
        <div className="text-center py-8 text-[#475569] flex-1">
          <p>No teams available</p>
          <p className="text-xs">Add teams to see the leaderboard</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto no-scrollbar flex-1 p-2">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-transparent">
                <TableHead className="w-10 text-center text-xs font-semibold text-[#334155]">#</TableHead>
                <TableHead className="text-xs font-semibold text-[#334155]">Team</TableHead>
                <TableHead className="text-right text-xs font-semibold text-[#334155]">Points</TableHead>
                <TableHead className="text-right text-xs font-semibold text-[#334155]">Purse Left</TableHead>
                <TableHead className="text-xs font-semibold text-[#334155]">Players</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {rankedTeams.map((team, index) => {
                  const hasMovedUp = prevRanks[team.id] > index;
                  const hasMovedDown = prevRanks[team.id] < index;
                  const displayIndex = index + startIndex;
                  
                  return (
                    <motion.tr
                      key={team.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: hasMovedUp ? [1, 1.02, 1] : 1,
                        background: hasMovedUp ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)'] : 'rgba(255,255,255,0)'
                      }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className={`border-white/10 hover:bg-white/40 transition-colors ${displayIndex === 1 ? "font-medium" : ""}`}
                    >
                      <TableCell className="text-center p-2">
                        {displayIndex === 1 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-[#ffd4b8] to-[#ffb8d9] text-[#1e293b] font-bold text-xs shadow-sm">
                            1
                          </span>
                        ) : (
                          <span className="text-xs text-[#334155] font-semibold">{displayIndex}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-display font-semibold text-sm text-[#1e293b] p-2">{team.name}</TableCell>
                      <TableCell className="text-right p-2">
                        <div className="flex items-center justify-end font-bold text-[#1e293b]">
                          {team.points}
                          {hasMovedUp && (
                            <motion.div
                              initial={{ opacity: 0, y: 2 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronsUp className="inline-block h-4 w-4 text-[#a78bfa] ml-1" />
                            </motion.div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-display font-bold text-[#334155] text-sm p-2">{team.purse} Cr</TableCell>
                      <TableCell className="p-2">
                        <div className="text-[10px] text-[#475569] leading-tight line-clamp-2">
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

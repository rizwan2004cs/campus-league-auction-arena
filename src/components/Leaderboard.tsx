
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Team } from './TeamCard';
import { ChevronsUp, Trophy } from 'lucide-react';

interface LeaderboardProps {
  teams: Team[];
}

const Leaderboard = ({ teams }: LeaderboardProps) => {
  // Sort teams by points in descending order
  const sortedTeams = [...teams].sort((a, b) => b.points - a.points);
  
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTeams.map((team, index) => (
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


import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPublicAuctionData } from '@/services/teamService';
import { Team } from '@/components/TeamCard';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronsUp, Trophy, Loader2 } from 'lucide-react';

const LeaderboardPage = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { teams, error } = await fetchPublicAuctionData();
        
        if (error) {
          throw error;
        }
        
        // Sort teams by points (descending), then by purse (descending)
        const sortedTeams = [...teams].sort((a, b) => {
          if (b.points !== a.points) {
            return b.points - a.points;
          }
          return b.purse - a.purse;
        });
        
        setTeams(sortedTeams);
        setLoading(false);
      } catch (error: any) {
        toast({
          title: 'Error loading leaderboard',
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh data every 10 seconds for real-time updates (without showing loading state)
    const interval = setInterval(fetchData, 10000);
    
    return () => clearInterval(interval);
  }, [toast]);
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">Live auction results</p>
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Live auction results</p>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Current Standings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No teams available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Purse Left</TableHead>
                    <TableHead>Players</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team, index) => (
                    <TableRow key={team.id} className={index === 0 ? "font-medium" : ""}>
                      <TableCell className="text-center">
                        {index === 0 ? (
                          <div className="flex justify-center">
                            <Badge className="bg-yellow-100 text-yellow-800">1</Badge>
                          </div>
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
                          {team.players?.length > 0 
                            ? team.players.map(p => p.name).join(', ') 
                            : 'No players'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Rankings are updated in real-time as bids are placed</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {teams.slice(0, 3).map((team, index) => (
          <Card key={team.id} className={`${index === 0 ? "border-primary/30 shadow-lg" : ""}`}>
            <CardHeader className={`${index === 0 ? "gradient-header text-white" : "bg-primary/5"}`}>
              <CardTitle className="flex items-center justify-between">
                <span className={index === 0 ? "text-white" : ""}>{team.name}</span>
                <Badge className={`${
                  index === 0 ? "bg-yellow-400 text-yellow-900 border-yellow-500" : 
                  index === 1 ? "bg-accent text-accent-foreground" : 
                  "bg-secondary/20 text-secondary-foreground"
                }`}>
                  {index === 0 ? "1st" : index === 1 ? "2nd" : "3rd"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between mb-4">
                <span className="text-sm text-muted-foreground">Points</span>
                <span className="font-bold">{team.points}</span>
              </div>
              <div className="flex justify-between mb-4">
                <span className="text-sm text-muted-foreground">Purse</span>
                <span>{team.purse} Cr</span>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Players</h4>
                {team.players?.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {team.players.map(player => (
                      <li key={player.id} className="flex justify-between">
                        <span>{player.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {player.category}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No players</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardPage;

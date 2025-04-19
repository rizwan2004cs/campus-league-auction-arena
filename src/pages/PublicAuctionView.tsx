import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import PlayerCard, { Player } from '@/components/PlayerCard';
import TeamCard, { Team } from '@/components/TeamCard';
import Leaderboard from '@/components/Leaderboard';
import { fetchPublicAuctionData } from '@/services/teamService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Award, 
  List,
  Loader2, 
  Users
} from 'lucide-react';

interface CategoryCounts {
  'Bowler': number;
  'Batter': number;
  'All-Rounder': number;
}

const PublicAuctionView = () => {
  const { toast } = useToast();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({
    'Bowler': 0,
    'Batter': 0,
    'All-Rounder': 0
  });
  const [loading, setLoading] = useState(true);
  const [prevTeamRanks, setPrevTeamRanks] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { players, teams, categoryCounts, error } = await fetchPublicAuctionData();
        
        if (error) {
          throw error;
        }
        
        const currentRanks = teams.reduce((acc, team, index) => {
          acc[team.id] = index;
          return acc;
        }, {} as Record<string, number>);
        
        setPrevTeamRanks(currentRanks);
        setPlayers(players);
        setTeams(teams);
        setCategoryCounts({
          'Bowler': categoryCounts['Bowler'] || 0,
          'Batter': categoryCounts['Batter'] || 0,
          'All-Rounder': categoryCounts['All-Rounder'] || 0
        });
      } catch (error: any) {
        toast({
          title: 'Error loading auction data',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, [toast]);
  
  const categorizedPlayers = players.reduce((acc, player) => {
    if (!acc[player.category]) {
      acc[player.category] = { sold: [], unsold: [] };
    }
    
    if (player.sold) {
      acc[player.category].sold.push(player);
    } else {
      acc[player.category].unsold.push(player);
    }
    
    return acc;
  }, {} as { [key: string]: { sold: Player[], unsold: Player[] } });
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Public Auction View</h1>
          <p className="text-muted-foreground">View live auction data</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-[400px] md:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Public Auction View</h1>
        <p className="text-muted-foreground">View live auction data</p>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card-with-shadow flex items-center space-x-4">
          <Badge variant="outline" className="bg-green-100 text-green-800 px-3 py-1 text-lg">
            {categoryCounts['Bowler']}
          </Badge>
          <div>
            <h3 className="font-medium">Bowlers</h3>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>
        
        <div className="card-with-shadow flex items-center space-x-4">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 px-3 py-1 text-lg">
            {categoryCounts['Batter']}
          </Badge>
          <div>
            <h3 className="font-medium">Batters</h3>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>
        
        <div className="card-with-shadow flex items-center space-x-4">
          <Badge variant="outline" className="bg-purple-100 text-purple-800 px-3 py-1 text-lg">
            {categoryCounts['All-Rounder']}
          </Badge>
          <div>
            <h3 className="font-medium">All-Rounders</h3>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <List className="h-5 w-5 mr-2" />
                Players by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="Bowler" className="w-full">
                <TabsList className="mb-4 w-full justify-start">
                  <TabsTrigger value="Bowler">Bowlers</TabsTrigger>
                  <TabsTrigger value="Batter">Batters</TabsTrigger>
                  <TabsTrigger value="All-Rounder">All-Rounders</TabsTrigger>
                </TabsList>
                
                {['Bowler', 'Batter', 'All-Rounder'].map((category) => (
                  <TabsContent key={category} value={category} className="space-y-4">
                    {categorizedPlayers[category]?.unsold.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Available Players</h3>
                        <AnimatePresence>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {categorizedPlayers[category]?.unsold.map((player) => (
                              <motion.div
                                key={player.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                              >
                                <PlayerCard 
                                  key={player.id} 
                                  player={player} 
                                  showActions={false} 
                                  isAuctionCard={false}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </AnimatePresence>
                      </div>
                    )}
                    
                    {categorizedPlayers[category]?.sold.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Sold Players</h3>
                        <AnimatePresence>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {categorizedPlayers[category]?.sold.map((player) => (
                              <motion.div
                                key={player.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                              >
                                <PlayerCard 
                                  key={player.id} 
                                  player={player} 
                                  showActions={false} 
                                  isAuctionCard={false}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </AnimatePresence>
                      </div>
                    )}
                    
                    {(!categorizedPlayers[category]?.unsold.length && !categorizedPlayers[category]?.sold.length) && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No {category}s available</p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Leaderboard teams={teams} />
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Team Rosters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue={teams[0]?.id || "empty"}>
                <TabsList className="p-0 bg-transparent border-b w-full justify-start overflow-x-auto">
                  {teams.length === 0 ? (
                    <TabsTrigger value="empty" disabled>No Teams</TabsTrigger>
                  ) : (
                    teams.map((team) => (
                      <TabsTrigger key={team.id} value={team.id} className="py-2">
                        {team.name}
                      </TabsTrigger>
                    ))
                  )}
                </TabsList>
                
                {teams.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No teams available</p>
                  </div>
                ) : (
                  teams.map((team) => (
                    <TabsContent key={team.id} value={team.id} className="pt-4">
                      <TeamCard
                        team={team}
                        initialPurse={50}
                        showPlayers={true}
                      />
                    </TabsContent>
                  ))
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicAuctionView;


import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import supabase from '@/lib/supabase';
import PlayerCard, { Player } from '@/components/PlayerCard';
import TeamCard, { Team } from '@/components/TeamCard';
import AuctionControls from '@/components/AuctionControls';
import Leaderboard from '@/components/Leaderboard';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Award, 
  CheckCircle, 
  List, 
  Loader2, 
  Timer, 
  Users, 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const AuctionRoom = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsWithPlayers, setTeamsWithPlayers] = useState<Team[]>([]);
  const [categoryCounts, setCategoryCounts] = useState({
    'Bowler': 0,
    'Batter': 0,
    'All-Rounder': 0
  });
  const [playerLimits, setPlayerLimits] = useState({
    'Bowler': 2,
    'Batter': 2,
    'All-Rounder': 2
  });
  const [loading, setLoading] = useState(true);
  
  // Fetch settings
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single();
        
      if (error) {
        // If no settings exist, create default
        await supabase
          .from('settings')
          .insert([
            { 
              players_per_team: 2, 
              initial_purse: 50 
            }
          ]);
        
        setPlayerLimits({
          'Bowler': 2,
          'Batter': 2,
          'All-Rounder': 2
        });
      } else if (data) {
        setPlayerLimits({
          'Bowler': data.players_per_team,
          'Batter': data.players_per_team,
          'All-Rounder': data.players_per_team
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };
  
  // Fetch players
  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('priority', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      const unsoldPlayers = (data || []).filter(player => !player.sold);
      setPlayers(unsoldPlayers);
      
      // Set current player
      if (unsoldPlayers.length > 0) {
        setCurrentPlayer(unsoldPlayers[0]);
      } else {
        setCurrentPlayer(null);
      }
      
      // Calculate category counts
      const counts = {
        'Bowler': 0,
        'Batter': 0,
        'All-Rounder': 0
      };
      
      unsoldPlayers.forEach((player) => {
        counts[player.category as keyof typeof counts]++;
      });
      
      setCategoryCounts(counts);
    } catch (error: any) {
      toast({
        title: 'Error fetching players',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  // Fetch teams
  const fetchTeams = async () => {
    try {
      // Get teams
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .order('points', { ascending: false });
        
      if (teamError) {
        throw teamError;
      }
      
      setTeams(teamData || []);
      
      // Get players for each team
      const teamsWithPlayersArray = await Promise.all(
        (teamData || []).map(async (team) => {
          const { data: teamPlayers, error: playersError } = await supabase
            .from('team_players')
            .select(`
              player_id,
              bid_price,
              players:player_id (*)
            `)
            .eq('team_id', team.id);
            
          if (playersError) {
            console.error('Error fetching team players:', playersError);
            return { ...team, players: [] };
          }
          
          // Transform data to include players
          const players = (teamPlayers || []).map(tp => ({
            ...tp.players,
            bid_price: tp.bid_price
          }));
          
          return { ...team, players };
        })
      );
      
      setTeamsWithPlayers(teamsWithPlayersArray);
    } catch (error: any) {
      toast({
        title: 'Error fetching teams',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    await fetchSettings();
    await fetchPlayers();
    await fetchTeams();
  };
  
  useEffect(() => {
    if (user) {
      fetchAllData();
      
      // Set up realtime subscriptions
      const playersSubscription = supabase
        .channel('players-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'players' 
        }, () => {
          fetchPlayers();
        })
        .subscribe();
        
      const teamsSubscription = supabase
        .channel('teams-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'teams' 
        }, () => {
          fetchTeams();
        })
        .subscribe();
        
      const teamPlayersSubscription = supabase
        .channel('team-players-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'team_players' 
        }, () => {
          fetchTeams();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(playersSubscription);
        supabase.removeChannel(teamsSubscription);
        supabase.removeChannel(teamPlayersSubscription);
      };
    }
  }, [user]);
  
  // Handle selecting a player from the list
  const handleSelectPlayer = (player: Player) => {
    setCurrentPlayer(player);
  };
  
  // Place bid
  const handlePlaceBid = async (playerId: string, teamId: string, bidAmount: number) => {
    try {
      const player = players.find(p => p.id === playerId);
      const team = teams.find(t => t.id === teamId);
      
      if (!player || !team) {
        throw new Error('Player or team not found');
      }
      
      // Validate bid amount against team purse
      if (bidAmount > team.purse) {
        throw new Error(`Bid amount (${bidAmount} Cr) exceeds team's purse (${team.purse} Cr)`);
      }
      
      // Update player
      const { error: playerError } = await supabase
        .from('players')
        .update({ 
          sold: true, 
          sold_to: teamId, 
          bid_price: bidAmount 
        })
        .eq('id', playerId);
        
      if (playerError) {
        throw playerError;
      }
      
      // Update team
      const newPurse = team.purse - bidAmount;
      const newPoints = team.points + player.points;
      
      const { error: teamError } = await supabase
        .from('teams')
        .update({ 
          purse: newPurse, 
          points: newPoints 
        })
        .eq('id', teamId);
        
      if (teamError) {
        throw teamError;
      }
      
      // Add to team_players
      const { error: teamPlayerError } = await supabase
        .from('team_players')
        .insert([{ 
          team_id: teamId, 
          player_id: playerId, 
          bid_price: bidAmount 
        }]);
        
      if (teamPlayerError) {
        throw teamPlayerError;
      }
      
      toast({
        title: 'Bid successful',
        description: `${player.name} sold to ${team.name} for ${bidAmount} Cr`,
      });
      
      // Move to next player
      const nextPlayer = players.find(p => p.id !== playerId && !p.sold);
      if (nextPlayer) {
        setCurrentPlayer(nextPlayer);
      } else {
        setCurrentPlayer(null);
        toast({
          title: 'Auction complete',
          description: 'All players have been sold',
        });
      }
      
      // Refresh data
      fetchAllData();
    } catch (error: any) {
      toast({
        title: 'Error placing bid',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  // Mark player as unsold
  const handleMarkUnsold = async (playerId: string) => {
    try {
      const player = players.find(p => p.id === playerId);
      
      if (!player) {
        throw new Error('Player not found');
      }
      
      // Find max priority for this category
      const maxPriority = Math.max(
        ...players
          .filter(p => p.category === player.category)
          .map(p => p.priority)
      );
      
      // Update player priority to move to end of category
      const { error } = await supabase
        .from('players')
        .update({ priority: maxPriority + 1 })
        .eq('id', playerId);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Player marked unsold',
        description: `${player.name} moved to end of queue`,
      });
      
      // Move to next player
      const remainingPlayers = players.filter(p => p.id !== playerId);
      if (remainingPlayers.length > 0) {
        setCurrentPlayer(remainingPlayers[0]);
      } else {
        setCurrentPlayer(null);
      }
      
      // Refresh data
      fetchAllData();
    } catch (error: any) {
      toast({
        title: 'Error marking player unsold',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  // Group players by category
  const categorizedPlayers = players.reduce((acc, player) => {
    if (!player.sold && player.id !== currentPlayer?.id) {
      if (!acc[player.category]) {
        acc[player.category] = [];
      }
      acc[player.category].push(player);
    }
    return acc;
  }, {} as { [key: string]: Player[] });
  
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading auction data...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Auction Room</h1>
        <p className="text-muted-foreground">Bid on players for your teams</p>
      </div>
      
      {/* Category counts */}
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
        {/* Auction column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current player */}
          {currentPlayer ? (
            <Card className="overflow-hidden">
              <CardHeader className="gradient-header text-white pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>Current Player</span>
                  <Timer className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PlayerCard 
                  player={currentPlayer} 
                  showActions={false}
                  isAuctionCard={true}
                />
              </CardContent>
              <CardFooter className="p-4 bg-gray-50">
                <AuctionControls 
                  player={currentPlayer}
                  teams={teams}
                  onPlaceBid={handlePlaceBid}
                  onMarkUnsold={handleMarkUnsold}
                  playerLimits={playerLimits}
                />
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Auction Complete</h2>
                <p className="text-muted-foreground">
                  All players have been auctioned
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Upcoming players */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <List className="h-5 w-5 mr-2" />
                Upcoming Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(categorizedPlayers).length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  <p>No more players in queue</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(categorizedPlayers).map(([category, categoryPlayers]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">
                        {category}s ({categoryPlayers.length})
                      </h3>
                      <div className="divide-y">
                        {categoryPlayers.map((player) => (
                          <div 
                            key={player.id} 
                            className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors px-2 rounded"
                            onClick={() => handleSelectPlayer(player)}
                          >
                            <div className="flex items-center space-x-3">
                              <Badge className={`
                                ${player.category === 'Bowler' ? 'bg-green-100 text-green-800' : ''}
                                ${player.category === 'Batter' ? 'bg-blue-100 text-blue-800' : ''}
                                ${player.category === 'All-Rounder' ? 'bg-purple-100 text-purple-800' : ''}
                              `}>
                                {player.category}
                              </Badge>
                              <span className="font-medium">{player.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{player.base_price} Cr</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectPlayer(player);
                                }}
                              >
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Leaderboard column (1/3) */}
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
              <Tabs defaultValue={teamsWithPlayers[0]?.id || "empty"}>
                <TabsList className="p-0 bg-transparent border-b w-full justify-start overflow-x-auto">
                  {teamsWithPlayers.length === 0 ? (
                    <TabsTrigger value="empty" disabled>No Teams</TabsTrigger>
                  ) : (
                    teamsWithPlayers.map((team) => (
                      <TabsTrigger key={team.id} value={team.id} className="py-2">
                        {team.name}
                      </TabsTrigger>
                    ))
                  )}
                </TabsList>
                
                {teamsWithPlayers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No teams available</p>
                  </div>
                ) : (
                  teamsWithPlayers.map((team) => (
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

export default AuctionRoom;


import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchTeams as fetchTeamsService, fetchPublicAuctionData, modifyPlayerBid, fetchRecentlySoldPlayer } from '@/services/teamService';
import { RecentlySoldWidget } from '@/components/RecentlySoldWidget';
import PlayerCard, { Player } from '@/components/PlayerCard';
import TeamCard, { Team } from '@/components/TeamCard';
import AuctionControls from '@/components/AuctionControls';
import Leaderboard from '@/components/Leaderboard';
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
  PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { generateAuctionCommentary } from '@/services/aiService';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface CelebrationData {
  player: Player;
  team: Team;
  bidAmount: number;
}

const AuctionRoom = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [recentlySoldPlayer, setRecentlySoldPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsWithPlayers, setTeamsWithPlayers] = useState<Team[]>([]);
  const [categoryCounts, setCategoryCounts] = useState({
    'Bowler': 0, 'Batter': 0, 'All-Rounder': 0
  });
  const [playerLimits, setPlayerLimits] = useState({
    'Bowler': 2, 'Batter': 2, 'All-Rounder': 2
  });
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
  
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').limit(1).single();
      if (error) {
        await supabase.from('settings').insert([{ players_per_team: 2, initial_purse: 50 }]);
        setPlayerLimits({ 'Bowler': 2, 'Batter': 2, 'All-Rounder': 2 });
      } else if (data) {
        setPlayerLimits({
          'Bowler': data.players_per_team, 'Batter': data.players_per_team, 'All-Rounder': data.players_per_team
        });
      }
    } catch (error) { console.error('Error fetching settings:', error); }
  };
  
  const fetchPlayers = async () => {
    try {
      const { players: fetchedPlayers, error } = await fetchPublicAuctionData();
      if (error) throw error;
      const unsoldPlayers = fetchedPlayers.filter(player => !player.sold);
      setPlayers(unsoldPlayers);
      if (unsoldPlayers.length > 0 && !currentPlayer) {
        setCurrentPlayer(unsoldPlayers[0]);
      } else if (unsoldPlayers.length > 0 && currentPlayer && currentPlayer.sold) {
        setCurrentPlayer(unsoldPlayers[0]);
      }
      const counts = { 'Bowler': 0, 'Batter': 0, 'All-Rounder': 0 };
      unsoldPlayers.forEach((player) => { counts[player.category as keyof typeof counts]++; });
      setCategoryCounts(counts);
    } catch (error: any) {
      toast({ title: 'Error fetching players', description: error.message, variant: 'destructive' });
    }
  };
  
  const fetchTeams = async () => {
    try {
      const { teams: fetchedTeams, error: teamsError } = await fetchTeamsService();
      const { teams: fetchedTeamsWithPlayers, error: playersError } = await fetchPublicAuctionData();
      if (teamsError) throw teamsError;
      if (playersError) throw playersError;
      setTeams(fetchedTeams);
      setTeamsWithPlayers(fetchedTeamsWithPlayers);
    } catch (error: any) {
      toast({ title: 'Error fetching teams', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  
  const fetchAllData = async () => {
    setLoading(true);
    await fetchSettings();
    await fetchPlayers();
    await fetchTeams();
    const recent = await fetchRecentlySoldPlayer();
    setRecentlySoldPlayer(recent);
  };
  
  useEffect(() => {
    if (user) {
      fetchAllData();
      const playersSubscription = supabase.channel('players-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchPlayers())
        .subscribe();
      const teamsSubscription = supabase.channel('teams-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchTeams())
        .subscribe();
      const teamPlayersSubscription = supabase.channel('team-players-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_players' }, () => fetchTeams())
        .subscribe();
      return () => {
        supabase.removeChannel(playersSubscription);
        supabase.removeChannel(teamsSubscription);
        supabase.removeChannel(teamPlayersSubscription);
      };
    }
  }, [user]);
  
  const categorizedPlayers = players.reduce((acc, player) => {
    if (!player.sold && player.id !== currentPlayer?.id) {
      if (!acc[player.category]) acc[player.category] = [];
      acc[player.category].push(player);
    }
    return acc;
  }, {} as { [key: string]: Player[] });
  
  const handlePlaceBid = async (playerId: string, teamId: string, bidAmount: number) => {
    try {
      setBidLoading(true);
      const playerToSell = players.find(p => p.id === playerId);
      if (!playerToSell || playerToSell.sold) throw new Error('This player has already been sold!');
      const { success, error } = await modifyPlayerBid(playerId, { sold: true, sold_to: teamId, bid_price: bidAmount });
      if (!success) throw error || new Error('Failed to place bid');
      
      const winningTeamObj = teams.find(t => t.id === teamId) || { id: teamId, name: 'Unknown Team', purse: 0, points: 0 };
      
      generateAuctionCommentary({
        event: 'SOLD',
        playerName: playerToSell.name,
        teamName: winningTeamObj.name,
        price: bidAmount
      }).then(text => {
        supabase.channel('auction-events').send({
          type: 'broadcast',
          event: 'AI_MEME',
          payload: { text, title: 'Live Commentary 🎙️' }
        });
      });
      
      if (currentPlayer && currentPlayer.id === playerId) {
        const winningTeamObj = teams.find(t => t.id === teamId) || { id: teamId, name: 'Unknown Team', purse: 0, points: 0 };
        
        // Trigger celebration overlay
        setCelebrationData({
          player: { ...currentPlayer, sold: true, sold_to: teamId, bid_price: bidAmount },
          team: winningTeamObj,
          bidAmount: bidAmount
        });

        // Hide celebration after 4 seconds
        setTimeout(() => {
          setCelebrationData(null);
        }, 4000);
        
        // Optimistically update current player to next so background is ready
        const nextPlayer = players.find(p => !p.sold && p.id !== playerId);
        if (nextPlayer) setCurrentPlayer(nextPlayer);
      }
      setTeams(prevTeams => prevTeams.map(team => {
        if (team.id === teamId) {
          const playerToAdd = players.find(p => p.id === playerId);
          return { ...team, purse: team.purse - bidAmount, points: team.points + (playerToAdd?.points || 0) };
        }
        return team;
      }));
      setPlayers(prevPlayers => prevPlayers.map(player => {
        if (player.id === playerId) return { ...player, sold: true, sold_to: teamId, bid_price: bidAmount };
        return player;
      }).filter(p => !p.sold || p.id === playerId));
      const soldPlayer = players.find(p => p.id === playerId);
      if (soldPlayer) {
        setCategoryCounts(prev => ({
          ...prev, [soldPlayer.category]: Math.max(0, prev[soldPlayer.category as keyof typeof prev] - 1)
        }));
      }
    } catch (error: any) {
      toast({ title: 'Error placing bid', description: error.message, variant: 'destructive' });
    } finally {
      setBidLoading(false);
      setTimeout(async () => {
        await fetchPlayers();
        await fetchTeams();
        const recent = await fetchRecentlySoldPlayer();
        setRecentlySoldPlayer(recent);
        
        // Broadcast explicit refresh signal
        supabase.channel('auction-events').send({
          type: 'broadcast',
          event: 'REFRESH',
          payload: {}
        });
      }, 500);
    }
  };
  
  const handlePassPlayer = (playerId: string) => {
    const playerToPass = players.find(p => p.id === playerId);
    if (playerToPass) {
      generateAuctionCommentary({
        event: 'UNSOLD',
        playerName: playerToPass.name,
      }).then(text => {
        supabase.channel('auction-events').send({
          type: 'broadcast',
          event: 'AI_MEME',
          payload: { text, title: 'Live Commentary 🎙️' }
        });
      });
    }
    
    // Broadcast pass event for sync mechanisms if needed
    supabase.channel('auction-events').send({
      type: 'broadcast',
      event: 'PASS',
      payload: { playerId }
    });
    
    const nextPlayer = players.find(p => !p.sold && p.id !== playerId);
    if (nextPlayer) {
      setCurrentPlayer(nextPlayer);
    }
    
    toast({ title: 'Player Skipped', description: 'Moved to next available player.' });
  };
  
  const handleSelectPlayer = (player: Player) => setCurrentPlayer(player);
  
  const handleCompleteAuction = () => {
    generateAuctionCommentary({ event: 'AUCTION_COMPLETE' }).then(text => {
      supabase.channel('auction-events').send({
         type: 'broadcast',
         event: 'AI_MEME',
         payload: { text, title: 'Final Verdict 🏆' }
      });
    });
    
    // Broadcast original complete event to trigger any sync mechanisms
    supabase.channel('auction-events').send({
       type: 'broadcast',
       event: 'AUCTION_COMPLETE',
       payload: {}
    });
    navigate('/summary');
  };
  
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-[#475569]">Loading auction…</span>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <div className="h-full overflow-y-auto no-scrollbar pb-10 relative">
      
      {/* Celebration Overlay */}
      <AnimatePresence>
        {celebrationData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e293b]/80 backdrop-blur-md p-4 overflow-hidden"
          >
            {/* Optional Confetti could go here if library installed, or just CSS animations */}
            <div className="absolute inset-0 z-0 flex justify-center pb-20">
              <div className="w-[800px] h-[800px] bg-gradient-to-tr from-[#ff8787]/20 to-[#a78bfa]/20 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            <motion.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="z-10 flex flex-col items-center w-full max-w-lg"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeInOut" }}
                className="mb-8"
              >
                <Badge className="bg-[#ff8787] text-white hover:bg-[#ff8787] text-3xl font-display font-extrabold px-8 py-3 rounded-full uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(253,130,135,0.6)]">
                  <PartyPopper className="w-8 h-8 mr-3 inline-block" />
                  Sold!
                </Badge>
              </motion.div>

              <div className="w-full relative shadow-2xl rounded-3xl overflow-hidden ring-4 ring-white/20">
                <PlayerCard player={celebrationData.player} showActions={false} isAuctionCard={true} />
                
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.8, type: "spring", bounce: 0.2 }}
                  className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl p-6 border-t font-display text-center"
                >
                  <p className="text-sm font-semibold text-[#475569] uppercase mb-1">Acquired By</p>
                  <h3 className="text-2xl font-extrabold text-[#1e293b] leading-tight mb-2">{celebrationData.team.name}</h3>
                  <div className="inline-flex items-center justify-center bg-[#ff8787]/10 text-[#ff8787] px-4 py-2 rounded-xl border border-[#ff8787]/20">
                    <span className="text-sm font-bold uppercase mr-2">For</span>
                    <span className="text-2xl font-black">{celebrationData.bidAmount} Cr</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-header text-3xl">Auction Room</h1>
            <p className="page-subtitle text-sm mt-1">Bid on players for your teams</p>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            {[
              { label: 'Bowlers', count: categoryCounts['Bowler'], cls: 'cat-bowler' },
              { label: 'Batters', count: categoryCounts['Batter'], cls: 'cat-batter' },
              { label: 'All-Rounders', count: categoryCounts['All-Rounder'], cls: 'cat-allrounder' },
            ].map(({ label, count, cls }) => (
              <div key={label} className="stat-chip flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl ${cls} flex items-center justify-center font-display font-bold text-lg`}>{count}</span>
                <span className="text-xs font-semibold text-[#1e293b] uppercase tracking-wider hidden sm:inline-block">{label}</span>
              </div>
            ))}
            
            <div className="h-8 w-px bg-white/30 hidden md:block mx-1"></div>
            
            <Button 
              onClick={handleCompleteAuction}
              className="primary-button h-[42px] px-5 rounded-xl text-sm font-semibold shadow-sm"
            >
              <Award className="mr-2 h-4 w-4" />
              Complete Auction
            </Button>
          </div>
        </div>
        
        {/* Main Layout: 2/3 Player, 1/3 Leaderboard */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Column: Player Card + Upcoming (spanning 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {currentPlayer ? (
              <div className="glass-card overflow-hidden">
                <div className="gradient-header px-6 py-4 flex items-center justify-between">
                  <span className="font-display font-bold text-[#1e293b]">Current Player</span>
                  <Timer className="h-5 w-5 text-[#334155]" />
                </div>
                {/* The PlayerCard will automatically expand beautifully because of lg:col-span-2 */}
                <div className="p-0">
                  <PlayerCard player={currentPlayer} showActions={false} isAuctionCard={true} />
                </div>
                <div className="bg-white/40 p-5 mt-2 border-t border-white/30 backdrop-blur-sm">
                  <AuctionControls 
                    player={currentPlayer}
                    teams={teams}
                    onPlaceBid={handlePlaceBid}
                    onPassPlayer={handlePassPlayer}
                    playerLimits={playerLimits}
                    bidLoading={bidLoading}
                  />
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h2 className="font-display font-bold text-2xl text-[#1e293b]">Auction Complete</h2>
                <p className="text-[#475569] mt-2">All players have been successfully auctioned.</p>
              </div>
            )}
            
            {/* Upcoming Players Queue */}
            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-lg text-[#1e293b] flex items-center gap-2 mb-4">
                <List className="h-5 w-5 text-[#9b8ec4]" />
                Upcoming Players
              </h3>
              
              {Object.keys(categorizedPlayers).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#475569]">No more players in queue</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(categorizedPlayers).map(([category, categoryPlayers]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-[#475569]">
                        {category}s ({categoryPlayers.length})
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {categoryPlayers.map((player) => (
                          <div 
                            key={player.id}
                            className="bg-white/30 hover:bg-white/60 transition-all px-4 py-3 rounded-xl cursor-pointer flex items-center justify-between shadow-sm border border-white/10"
                            onClick={() => handleSelectPlayer(player)}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg ${
                                player.category === 'Bowler' ? 'cat-bowler' :
                                player.category === 'Batter' ? 'cat-batter' : 'cat-allrounder'
                              }`}>{player.category.charAt(0)}</span>
                              <span className="font-medium text-sm text-[#1e293b]">{player.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-sm text-[#334155]">{player.base_price}Cr</span>
                              <ArrowRight className="h-4 w-4 text-[#93c5fd]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column: Leaderboard + Team Rosters (spanning 1 column) */}
          <div className="space-y-6">
            <div className="glass-card overflow-hidden">
              <Leaderboard teams={teams} />
            </div>

            {recentlySoldPlayer && (
              <RecentlySoldWidget 
                player={recentlySoldPlayer} 
                teams={teams} 
                onBidUpdated={fetchAllData} 
              />
            )}
            
            <div className="glass-card overflow-hidden flex flex-col max-h-[600px]">
              <div className="gradient-header px-4 py-3 flex items-center gap-2 flex-shrink-0">
                <Award className="h-4 w-4 text-[#334155]" />
                <h3 className="font-display font-bold text-sm text-[#1e293b]">Team Rosters</h3>
              </div>
              <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
                <Tabs defaultValue={teamsWithPlayers[0]?.id || "empty"}>
                  <TabsList className="bg-transparent border-b border-white/30 w-full justify-start overflow-x-auto no-scrollbar h-auto pb-2 mb-4 rounded-none">
                    {teamsWithPlayers.length === 0 ? (
                      <TabsTrigger value="empty" disabled className="text-xs">No Teams</TabsTrigger>
                    ) : (
                      teamsWithPlayers.map((team) => (
                        <TabsTrigger key={team.id} value={team.id} className="text-xs data-[state=active]:bg-white/50 rounded-xl px-3 py-1.5">
                          {team.name}
                        </TabsTrigger>
                      ))
                    )}
                  </TabsList>
                  
                  {teamsWithPlayers.length === 0 ? (
                    <div className="text-center py-10">
                      <Users className="h-8 w-8 mx-auto text-[#93c5fd] mb-3" />
                      <p className="text-sm text-[#475569]">No teams available</p>
                    </div>
                  ) : (
                    teamsWithPlayers.map((team) => (
                      <TabsContent key={team.id} value={team.id} className="mt-0">
                        <TeamCard team={team} initialPurse={50} showPlayers={true} onTeamUpdated={fetchAllData} />
                      </TabsContent>
                    ))
                  )}
                </Tabs>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
};

export default AuctionRoom;

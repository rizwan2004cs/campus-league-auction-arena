import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPublicAuctionData } from '@/services/teamService';
import { Team } from '@/components/TeamCard';
import { Trophy, Medal, Award, ArrowLeft, Loader2, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PlayerCard, { Player } from '@/components/PlayerCard';

const AuctionSummary = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Load final auction results
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { teams: fetchedTeams } = await fetchPublicAuctionData();
      
      // Sort teams by points descending
      const rankedTeams = [...(fetchedTeams || [])].sort((a, b) => b.points - a.points);
      setTeams(rankedTeams);
      setLoading(false);
    };
    loadData();
  }, []);

  // Determine "Best Buy" for a team
  const getBestBuy = (teamPlayers: Player[]) => {
    if (!teamPlayers || teamPlayers.length === 0) return null;
    
    // Sort logic: Top priority (lowest number), then Points (highest), then Price (highest)
    return [...teamPlayers].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.points !== b.points) return b.points - a.points;
      return (b.bid_price || 0) - (a.bid_price || 0);
    })[0];
  };

  const teamsWithPlayers = teams.filter(t => t.players && t.players.length > 0);
  const top3 = teamsWithPlayers.slice(0, 3);
  const remainingTeams = teams.filter(t => !top3.find(pt => pt.id === t.id));

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#ff8787]" />
      </div>
    );
  }

  return (
    <div className="min-h-full w-full overflow-y-auto no-scrollbar py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 relative">
          <Button 
            variant="ghost" 
            className="absolute left-0 top-0 text-[#475569] hover:bg-white/20 hover:text-[#1e293b] rounded-xl hidden md:flex" 
            onClick={() => navigate('/auction')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Auction
          </Button>
          <Badge className="bg-[#ff8787]/20 text-[#ff8787] hover:bg-[#ff8787]/30 border-0 rounded-full px-4 py-1 font-display uppercase tracking-widest">
            Auction Concluded
          </Badge>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl text-[#1e293b] tracking-tight">
            Final Standings
          </h1>
          <p className="text-[#475569] font-medium max-w-xl mx-auto">
            The hammer has fallen. Here are the top performing teams and their most valuable assets secured during the draft.
          </p>
        </div>

        {/* Podium - Top 3 */}
        {top3.length > 0 && (
          <div className="flex flex-col md:flex-row items-end justify-center gap-6 mt-10">
            {/* Rank 2 - Silver */}
            {top3[1] && (
              <PodiumCard 
                team={top3[1]} 
                rank={2} 
                bestBuy={getBestBuy(top3[1].players || [])} 
                icon={<Medal className="h-8 w-8 text-[#94a3b8]" />}
                colorClass="from-[#e2e8f0]/80 to-[#f1f5f9]/80 border-[#cbd5e1]/50"
                heightClass="md:h-[350px]"
              />
            )}

            {/* Rank 1 - Gold */}
            {top3[0] && (
              <PodiumCard 
                team={top3[0]} 
                rank={1} 
                bestBuy={getBestBuy(top3[0].players || [])} 
                icon={<Trophy className="h-12 w-12 text-[#eab308]" />}
                colorClass="from-[#fef08a]/80 to-[#fde047]/60 border-[#fde047]/50 shadow-[0_0_30px_rgba(250,204,21,0.3)] z-10"
                heightClass="md:h-[400px]"
              />
            )}

            {/* Rank 3 - Bronze */}
            {top3[2] && (
              <PodiumCard 
                team={top3[2]} 
                rank={3} 
                bestBuy={getBestBuy(top3[2].players || [])} 
                icon={<Award className="h-8 w-8 text-[#b45309]" />}
                colorClass="from-[#ffedd5]/80 to-[#fed7aa]/80 border-[#fdba74]/50"
                heightClass="md:h-[320px]"
              />
            )}
          </div>
        )}

        {/* Remaining Teams */}
        {remainingTeams.length > 0 && (
          <div className="mx-auto max-w-4xl space-y-4 pt-8">
            <h3 className="font-display font-bold text-xl text-[#1e293b] mb-6 text-center">Remaining Teams</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {remainingTeams.map((team, index) => {
                const bestBuy = getBestBuy(team.players || []);
                return (
                  <div key={team.id} className="glass-card p-4 flex items-center justify-between group hover:bg-white/60 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-white/50 flex items-center justify-center font-display font-bold text-[#334155]">
                        #{index + 4}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-[#1e293b] leading-tight">{team.name}</h4>
                        <p className="text-xs font-semibold text-[#475569]">{team.points} Points • {team.players?.length || 0} Players</p>
                      </div>
                    </div>
                    {bestBuy && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold">Best Buy</p>
                        <p className="text-sm font-bold text-[#ff8787]">{bestBuy.name}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center pt-10 pb-8">
          <Button 
            className="primary-button text-lg px-8 py-6 rounded-2xl shadow-xl flex items-center gap-2"
            onClick={() => navigate('/auction')}
          >
            <ArrowLeft className="h-5 w-5" />
            Continue Auction
          </Button>
        </div>
      </div>
    </div>
  );
};

interface PodiumCardProps {
  team: Team;
  rank: number;
  bestBuy: Player | null;
  icon: React.ReactNode;
  colorClass: string;
  heightClass: string;
}

const PodiumCard = ({ team, rank, bestBuy, icon, colorClass, heightClass }: PodiumCardProps) => {
  return (
    <div className={`w-full max-w-sm rounded-[2rem] border backdrop-blur-xl bg-gradient-to-br p-6 flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 ${colorClass} ${heightClass}`}>
      <div className="space-y-4 text-center pb-4">
        <div className="mx-auto bg-white/40 shadow-sm backdrop-blur-sm h-16 w-16 rounded-full flex items-center justify-center mb-2">
          {icon}
        </div>
        <div>
          <Badge className="mb-2 bg-white/50 text-[#1e293b] border-0">Rank {rank}</Badge>
          <h3 className="font-display font-extrabold text-[#1e293b] text-2xl leading-tight">
            {team.name}
          </h3>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-black/5 px-3 py-1 rounded-xl">
            <span className="font-bold text-[#334155]">{team.points}</span>
            <span className="text-xs uppercase tracking-wider font-semibold text-[#475569]">Pts</span>
          </div>
        </div>
      </div>

      {bestBuy ? (
        <div className="mt-auto bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/40 group">
          <div className="flex justify-between items-start mb-2 border-b border-black/5 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Best Buy</span>
            <div className="flex items-center gap-0.5 text-[#ff8787]">
              <span className="font-display font-bold text-sm tracking-tight">{bestBuy.bid_price} Cr</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {bestBuy.image_url ? (
               <div className="h-10 w-10 rounded-full overflow-hidden border border-white/50 shrink-0 shadow-sm bg-white">
                 <img 
                   src={bestBuy.image_url} 
                   alt={bestBuy.name} 
                   className="h-full w-full object-cover"
                   onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLElement).parentElement!.innerHTML = `<span class="flex h-full items-center justify-center font-display font-bold text-[#334155] bg-white/50 text-sm shadow-sm">${bestBuy.name.charAt(0)}</span>`;
                   }}
                 />
               </div>
             ) : (
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-display font-bold text-[#334155] bg-white text-base shadow-sm shrink-0">
                  {bestBuy.name.charAt(0)}
                </div>
             )}
             <div className="min-w-0">
               <p className="font-bold text-[#1e293b] truncate text-sm leading-tight group-hover:text-primary transition-colors">{bestBuy.name}</p>
               <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 mt-0.5 inline-block rounded-md ${
                 bestBuy.category === 'Bowler' ? 'cat-bowler' :
                 bestBuy.category === 'Batter' ? 'cat-batter' : 'cat-allrounder'
               }`}>{bestBuy.category}</span>
             </div>
          </div>
        </div>
      ) : (
        <div className="mt-auto bg-white/40 rounded-2xl p-4 text-center border border-white/20 border-dashed">
          <p className="text-xs font-semibold text-[#475569]">No players secured</p>
        </div>
      )}
    </div>
  );
};

export default AuctionSummary;

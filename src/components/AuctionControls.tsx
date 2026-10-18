
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Team } from './TeamCard';
import { Player } from './PlayerCard';
import { Hammer, RotateCcw, AlertCircle, Loader2, SkipForward } from 'lucide-react';
import { modifyPlayerBid } from '@/services/teamService';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuctionControlsProps {
  player: Player;
  teams: Team[];
  onPlaceBid: (playerId: string, teamId: string, bidAmount: number) => Promise<void>;
  onPassPlayer?: (playerId: string) => void;
  playerLimits: { [key: string]: number };
  bidLoading?: boolean;
}

const AuctionControls = ({
  player,
  teams,
  onPlaceBid,
  onPassPlayer,
  playerLimits,
  bidLoading = false
}: AuctionControlsProps) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [bidAmount, setBidAmount] = useState<number>(player.base_price || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  
  useEffect(() => {
    setBidAmount(player.base_price || 0);
    setSelectedTeamId('');
    setError(null);
  }, [player]);
  
  useEffect(() => {
    setError(null);
    
    if (selectedTeam && bidAmount > selectedTeam.purse) {
      setError(`Bid amount (${bidAmount} Cr) exceeds team's purse (${selectedTeam.purse} Cr)`);
    }
  }, [selectedTeam, bidAmount]);
  
  const eligibleTeams = teams.filter(team => {
    if (!team || !player) return false;
    
    if (team.purse < (player.base_price || 0)) return false;
    
    if (team.players && playerLimits) {
      const categoryPlayers = team.players.filter(p => p.category === player.category) || [];
      const limit = playerLimits[player.category] || 2;
      if (categoryPlayers.length >= limit) return false;
    }
    
    return true;
  });
  
  const handlePlaceBid = async () => {
    if (!selectedTeamId || bidAmount <= 0 || !player || !player.id) return;
    
    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    if (!selectedTeam || bidAmount > selectedTeam.purse) {
      toast({
        title: 'Invalid bid',
        description: `Bid amount exceeds team's purse. Maximum bid allowed: ${selectedTeam?.purse} Cr`,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setLoading(true);
      await onPlaceBid(player.id, selectedTeamId, bidAmount);
    } finally {
      setLoading(false);
      setSelectedTeamId('');
      setBidAmount(player.base_price || 0);
    }
  };
  
  const handleModifyBid = async () => {
    if (!player || !player.id) return;
    
    try {
      setLoading(true);
      
      if (selectedTeamId && bidAmount > 0) {
        const selectedTeam = teams.find(t => t.id === selectedTeamId);
        if (!selectedTeam || bidAmount > selectedTeam.purse) {
          toast({
            title: 'Invalid bid modification',
            description: `Bid amount exceeds team's purse. Maximum bid allowed: ${selectedTeam?.purse} Cr`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        
        const { success, error } = await modifyPlayerBid(player.id, {
          sold: true,
          sold_to: selectedTeamId,
          bid_price: bidAmount
        });
        
        if (success) {
          toast({
            title: 'Bid modified',
            description: `Player has been assigned to a new team with bid amount ${bidAmount} Cr`,
          });
          await onPlaceBid(player.id, selectedTeamId, bidAmount);
        } else {
          toast({
            title: 'Error modifying bid',
            description: error?.message || 'An error occurred',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setLoading(false);
      setSelectedTeamId('');
      setBidAmount(player.base_price || 0);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base text-ink">Who's bidding?</h3>
        <span className="dot-label text-[11px] text-soft">
          <span className="dot text-[15px] text-ink">{eligibleTeams.length}</span> can afford
        </span>
      </div>

      <div className="space-y-4">
        {/* Every team that can still buy this player, one tap to pick the bidder. */}
        {eligibleTeams.length === 0 ? (
          <p className="rounded-xl bg-raised p-3 text-sm text-ink">
            No franchise can afford this player or has a slot left. Pass them.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Bidding team" className="grid grid-cols-2 gap-2">
            {eligibleTeams.map(team => {
              const picked = selectedTeamId === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  disabled={bidLoading || loading}
                  onClick={() => setSelectedTeamId(picked ? '' : team.id)}
                  className={`flex min-w-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                    picked ? 'border-tan bg-tan text-white' : 'border-line bg-surface text-ink hover:border-tan/50'
                  }`}
                >
                  <span className="w-full truncate text-sm font-semibold">{team.name}</span>
                  <span className={`text-xs ${picked ? 'text-white/85' : 'text-soft'}`}>
                    <span className="dot text-[13px]">{team.purse}</span> Cr left
                  </span>
                </button>
              );
            })}
          </div>
        )}
        
        <div className="space-y-1.5">
          <Label htmlFor="bid-amount" className="text-xs font-semibold text-ink">Bid Amount (Cr)</Label>
          <Input
            id="bid-amount"
            type="number"
            min={player.base_price}
            max={selectedTeam?.purse || player.base_price}
            step="0.5"
            value={bidAmount}
            onChange={(e) => setBidAmount(parseFloat(e.target.value))}
            className={`glass-input rounded-xl h-10 ${error ? "border-red-500" : ""}`}
            disabled={bidLoading || loading}
          />
          <p className="text-[10px] text-soft">
            Minimum bid: {player.base_price} Cr
            {selectedTeam && ` | Maximum bid: ${selectedTeam.purse} Cr`}
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="py-2 bg-red-50/50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col space-y-2 pt-2">
          {!player.sold ? (
            <>
              <Button
                className="w-full primary-button"
                onClick={handlePlaceBid}
                disabled={!selectedTeamId || bidAmount < player.base_price || loading || bidLoading || eligibleTeams.length === 0 || !!error}
              >
                {bidLoading || loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Hammer className="mr-2 h-4 w-4" />
                    Place Bid
                  </>
                )}
              </Button>
              {onPassPlayer && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-line hover:bg-line text-soft hover:text-ink"
                  onClick={() => onPassPlayer(player.id)}
                  disabled={loading || bidLoading}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Pass Player
                </Button>
              )}
            </>
          ) : (
            <Button
              className="w-full primary-button"
              onClick={handleModifyBid}
              disabled={loading || bidLoading || (selectedTeamId === '' && player.sold) || !!error}
            >
              {bidLoading || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {selectedTeamId ? 'Change Team/Bid' : 'Release Player'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuctionControls;

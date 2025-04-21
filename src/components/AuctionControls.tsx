
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
import { Hammer, RotateCcw, AlertCircle } from 'lucide-react';
import { modifyPlayerBid } from '@/services/teamService';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuctionControlsProps {
  player: Player;
  teams: Team[];
  onPlaceBid: (playerId: string, teamId: string, bidAmount: number) => Promise<void>;
  playerLimits: { [key: string]: number };
}

const AuctionControls = ({
  player,
  teams,
  onPlaceBid,
  playerLimits
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
    <div className="card-with-shadow">
      <h3 className="text-lg font-semibold mb-4">Auction Controls</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="team-select">Select Team</Label>
          <Select 
            value={selectedTeamId} 
            onValueChange={setSelectedTeamId}
          >
            <SelectTrigger id="team-select" className="w-full">
              <SelectValue placeholder="Select team to bid" />
            </SelectTrigger>
            <SelectContent>
              {eligibleTeams.length === 0 ? (
                <SelectItem value="no-teams" disabled>
                  No eligible teams
                </SelectItem>
              ) : (
                eligibleTeams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} - {team.purse} Cr
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bid-amount">Bid Amount (Cr)</Label>
          <Input
            id="bid-amount"
            type="number"
            min={player.base_price}
            max={selectedTeam?.purse || player.base_price}
            step="0.5"
            value={bidAmount}
            onChange={(e) => setBidAmount(parseFloat(e.target.value))}
            className={error ? "border-red-500" : ""}
          />
          <p className="text-xs text-muted-foreground">
            Minimum bid: {player.base_price} Cr
            {selectedTeam && ` | Maximum bid: ${selectedTeam.purse} Cr`}
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col space-y-2 pt-2">
          {!player.sold ? (
            <Button
              className="w-full"
              onClick={handlePlaceBid}
              disabled={!selectedTeamId || bidAmount < player.base_price || loading || eligibleTeams.length === 0 || !!error}
            >
              <Hammer className="mr-2 h-4 w-4" />
              Place Bid
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleModifyBid}
              disabled={loading || (selectedTeamId === '' && player.sold) || !!error}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {selectedTeamId ? 'Change Team/Bid' : 'Release Player'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuctionControls;

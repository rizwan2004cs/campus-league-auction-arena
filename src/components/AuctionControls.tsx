
import { useState } from 'react';
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
import { Hammer, ArrowBigDown, Ban } from 'lucide-react';

interface AuctionControlsProps {
  player: Player;
  teams: Team[];
  onPlaceBid: (playerId: string, teamId: string, bidAmount: number) => Promise<void>;
  onMarkUnsold: (playerId: string) => Promise<void>;
  playerLimits: { [key: string]: number };
}

const AuctionControls = ({
  player,
  teams,
  onPlaceBid,
  onMarkUnsold,
  playerLimits
}: AuctionControlsProps) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [bidAmount, setBidAmount] = useState<number>(player.base_price || 0);
  const [loading, setLoading] = useState(false);
  
  // Filter eligible teams - those with enough purse and under category limit
  const eligibleTeams = teams.filter(team => {
    const categoryPlayers = team.players?.filter(p => p.category === player.category) || [];
    const isUnderLimit = categoryPlayers.length < (playerLimits[player.category] || 2);
    return team.purse >= player.base_price && isUnderLimit;
  });
  
  const handlePlaceBid = async () => {
    if (!selectedTeamId || bidAmount <= 0) return;
    
    try {
      setLoading(true);
      await onPlaceBid(player.id, selectedTeamId, bidAmount);
    } finally {
      setLoading(false);
      setSelectedTeamId('');
      setBidAmount(0);
    }
  };
  
  const handleMarkUnsold = async () => {
    try {
      setLoading(true);
      await onMarkUnsold(player.id);
    } finally {
      setLoading(false);
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
            step="0.5"
            value={bidAmount}
            onChange={(e) => setBidAmount(parseFloat(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Minimum bid: {player.base_price} Cr
          </p>
        </div>
        
        <div className="flex flex-col space-y-2 pt-2">
          <Button
            className="w-full"
            onClick={handlePlaceBid}
            disabled={!selectedTeamId || bidAmount < player.base_price || loading || eligibleTeams.length === 0}
          >
            <Hammer className="mr-2 h-4 w-4" />
            Place Bid
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={handleMarkUnsold}
            disabled={loading}
          >
            <Ban className="mr-2 h-4 w-4" />
            Mark Unsold
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuctionControls;

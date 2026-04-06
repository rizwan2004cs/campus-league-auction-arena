import { useState, useEffect } from 'react';
import { Player } from './PlayerCard';
import { Team } from './TeamCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit2, Loader2 } from 'lucide-react';
import { modifyPlayerBid } from '@/services/teamService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateAuctionCommentary } from '@/services/aiService';

interface RecentlySoldWidgetProps {
  player: Player | null;
  teams: Team[];
  onBidUpdated: () => void;
}

export const RecentlySoldWidget = ({ player, teams, onBidUpdated }: RecentlySoldWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (player) {
      const team = teams.find(t => t.name === player.sold_to);
      setSelectedTeamId(team?.id || '');
      setBidAmount(player.bid_price || player.base_price || 0);
    }
  }, [player, teams, isOpen]);

  if (!player) return null;

  const handleUpdate = async () => {
    if (!selectedTeamId || bidAmount < (player.base_price || 0)) return;
    
    setLoading(true);
    try {
      const { success, error } = await modifyPlayerBid(player.id, {
        sold: true,
        sold_to: selectedTeamId,
        bid_price: bidAmount
      });
      
      if (success) {
        toast({ title: 'Success', description: 'Player auction details updated.' });
        
        const teamObj = teams.find(t => t.id === selectedTeamId);
        generateAuctionCommentary({
           event: 'MISTAKE',
           playerName: player.name,
           teamName: teamObj?.name || 'A team',
           price: bidAmount
        }).then(text => {
           supabase.channel('auction-events').send({
              type: 'broadcast',
              event: 'AI_MEME',
              payload: { text, title: 'Auctioneer Mistake Alert 🚨' }
           });
        });
        
        setIsOpen(false);
        onBidUpdated();
      } else {
        throw error;
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card overflow-hidden mt-6 shadow-sm border border-[#c8b0ff]/30">
      <div className="bg-[#fbc2eb]/30 px-3 py-2 border-b border-[#c8b0ff]/20 flex items-center justify-between">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#1e293b]">Recently Sold</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-[#334155] hover:text-[#1e293b] hover:bg-white/40 rounded-full">
              <Edit2 className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-[#1e293b] text-xl">Edit Auction Result</DialogTitle>
              <DialogDescription className="text-[#475569]">
                Correct a mistake for {player.name}. The previous team's purse will be refunded automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-5">
              <div className="space-y-2">
                <Label className="text-[#1e293b] font-semibold">Sold To Team</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={loading}>
                  <SelectTrigger className="glass-input h-11">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-none">
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} (Purse: {t.purse} Cr)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#1e293b] font-semibold">Bid Amount (Cr)</Label>
                <Input 
                  type="number" 
                  step="0.5" 
                  min={player.base_price} 
                  value={bidAmount} 
                  onChange={e => setBidAmount(parseFloat(e.target.value))} 
                  className="glass-input h-11"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={loading} className="text-[#334155] hover:bg-black/5 rounded-xl">Cancel</Button>
              <Button onClick={handleUpdate} disabled={loading} className="primary-button rounded-xl shadow-md">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div 
        className="p-4 flex items-center gap-3 bg-white/20 hover:bg-white/40 transition-colors cursor-pointer group" 
        onClick={() => setIsOpen(true)}
      >
        {player.image_url ? (
          <img src={player.image_url} alt={player.name} className="w-10 h-10 rounded-full object-cover shadow-sm bg-white" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-[#334155] bg-white/50 text-base shadow-sm border border-white/20">
            {player.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-[#1e293b] truncate leading-tight group-hover:text-primary transition-colors">{player.name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
             <span className={`text-[8px] uppercase font-bold px-1.5 py-px rounded-md ${
               player.category === 'Bowler' ? 'cat-bowler' :
               player.category === 'Batter' ? 'cat-batter' : 'cat-allrounder'
             }`}>{player.category.charAt(0)}</span>
             <p className="text-[11px] font-semibold text-[#334155] truncate">{player.sold_to}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-display font-bold text-[#ff8787] text-base bg-white/60 px-2 py-0.5 rounded-lg shadow-sm border border-white/40 group-hover:scale-105 transition-transform">
            {player.bid_price} Cr
          </span>
        </div>
      </div>
    </div>
  );
};

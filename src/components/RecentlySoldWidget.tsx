import { useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Player, CategoryMark } from './PlayerCard';
import { Team } from './TeamCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { modifyPlayerBid } from '@/services/teamService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateAuctionCommentary } from '@/services/aiService';
import PlayerPhoto from '@/components/PlayerPhoto';

interface RecentlySoldWidgetProps {
  player: Player | null;
  teams: Team[];
  onBidUpdated: () => void;
}

export const RecentlySoldWidget = ({ player, teams, onBidUpdated }: RecentlySoldWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [bidInput, setBidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!player) return null;

  const currentTeam = teams.find(t => t.name === player.sold_to);
  const currentPrice = player.bid_price || 0;

  // Fill the form once, when it opens, so live reloads never overwrite an edit in progress.
  const open = () => {
    setSelectedTeamId(currentTeam?.id || '');
    setBidInput(String(currentPrice || player.base_price || ''));
    setIsOpen(true);
  };

  const bid = Number(bidInput);
  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  // The old team gets its money back first, so moving within the same team frees that amount.
  const available = selectedTeam ? selectedTeam.purse + (selectedTeam.id === currentTeam?.id ? currentPrice : 0) : 0;
  const error =
    !selectedTeamId ? 'Pick a team.' :
    !bidInput || Number.isNaN(bid) ? 'Enter a price.' :
    bid < player.base_price ? `The base price is ${player.base_price} Cr.` :
    bid > available ? `${selectedTeam?.name} can spend at most ${available} Cr.` :
    null;
  const unchanged = selectedTeamId === currentTeam?.id && bid === currentPrice;

  const handleUpdate = async () => {
    if (error || unchanged) return;
    setLoading(true);
    const { success, error: saveError } = await modifyPlayerBid(player.id, {
      sold: true,
      sold_to: selectedTeamId,
      bid_price: bid,
    });
    setLoading(false);

    if (!success) {
      toast({ title: 'Could not update the sale', description: saveError?.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Sale corrected', description: `${player.name} → ${selectedTeam?.name} for ${bid} Cr.` });
    generateAuctionCommentary({
      event: 'MISTAKE',
      playerName: player.name,
      teamName: selectedTeam?.name || 'A team',
      price: bid,
    }).then(text => {
      supabase.channel('auction-events').send({
        type: 'broadcast',
        event: 'AI_MEME',
        payload: { text, title: 'Auctioneer Mistake Alert 🚨' },
      });
    });
    setIsOpen(false);
    onBidUpdated();
  };

  return (
    <div className="panel shrink-0 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Last sale</h3>
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-tan transition-colors hover:bg-raised"
        >
          <Pencil className="h-3.5 w-3.5" /> Fix it
        </button>
      </div>

      <button
        type="button"
        onClick={open}
        className="flex w-full items-center gap-3 rounded-xl bg-raised p-3 text-left transition-colors hover:bg-line"
      >
        <PlayerPhoto src={player.image_url} name={player.name} className="h-12 w-12 shrink-0 rounded-full" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{player.name}</span>
          <span className="mt-0.5 flex items-center gap-2 text-sm text-soft">
            <CategoryMark category={player.category} short />
            <span className="truncate">{player.sold_to}</span>
          </span>
        </span>
        <span className="figure shrink-0 text-2xl text-tan">{currentPrice}<span className="ml-0.5 text-sm">Cr</span></span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Fix the last sale</DialogTitle>
            <DialogDescription>
              Change where {player.name} went or what they cost. The old team gets {currentPrice} Cr back automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="fix-team" className="text-sm font-medium text-ink">Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={loading}>
                <SelectTrigger id="fix-team" className="glass-input h-11 rounded-xl">
                  <SelectValue placeholder="Pick a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.purse + (t.id === currentTeam?.id ? currentPrice : 0)} Cr available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fix-price" className="text-sm font-medium text-ink">Price (Cr)</Label>
              <Input
                id="fix-price"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={player.base_price}
                value={bidInput}
                onChange={e => setBidInput(e.target.value)}
                className="glass-input h-11 rounded-xl"
                aria-invalid={!!error}
                aria-describedby="fix-error"
                disabled={loading}
              />
              <p id="fix-error" className={error ? 'text-sm text-leather' : 'text-sm text-soft'}>
                {error ?? `Base price ${player.base_price} Cr.`}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsOpen(false)} disabled={loading} className="secondary-button">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={loading || !!error || unchanged}
              className="primary-button inline-flex items-center gap-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

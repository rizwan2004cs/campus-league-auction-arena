import { Shield, Users, Pencil, Trash2, UserMinus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Player } from './PlayerCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { deleteTeam, updateTeam, modifyPlayerBid } from '@/services/teamService';
import { supabase } from '@/integrations/supabase/client';
import { generateAuctionCommentary } from '@/services/aiService';
import { MEMES_BROKE, MEMES_CONFUSION, MEMES_STRATEGY, MEMES_STEAL, MEMES_OVERPRICED, MEMES_20_CR } from '@/data/memes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type Team = {
  id: string;
  name: string;
  purse: number;
  points: number;
  players?: Player[];
};

const stripGloss = (line: string) => line.replace(/\s*\(.*?\)\s*$/, '');

// Pools per public-view situation; each team gets a stable line via a hash of its id.
const QUOTES_SPECTATOR = [...MEMES_BROKE, ...MEMES_CONFUSION.slice(0, 5)].map(stripGloss);
const QUOTES_BANKRUPT = [...MEMES_OVERPRICED].map(stripGloss);
const QUOTES_MASTERMIND = [...MEMES_STRATEGY, ...MEMES_STEAL].map(stripGloss);
const QUOTES_AGGRESSIVE = [...MEMES_20_CR].map(stripGloss);

const hashId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const TeamQuote = ({ teamId, pool, label }: { teamId: string; pool: string[]; label: string }) => (
  <div className="rounded-xl bg-raised p-3 text-center">
    <p className="text-sm italic text-ink">"{pool[hashId(teamId) % pool.length]}"</p>
    <p className="dot-label text-[11px] text-tan mt-1">{label}</p>
  </div>
);

interface TeamCardProps {
  team: Team;
  initialPurse?: number;
  showPlayers?: boolean;
  isEditable?: boolean;
  isPublicView?: boolean;
  onTeamUpdated?: () => void;
}

const TeamCard = ({ 
  team, 
  initialPurse = 50,
  showPlayers = false,
  isEditable = false,
  isPublicView = false,
  onTeamUpdated 
}: TeamCardProps) => {
  const { name, purse, points, players = [] } = team;
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const { toast } = useToast();
  
  const pursePercentage = (purse / initialPurse) * 100;
  
  const handleRelievePlayer = async (playerId: string) => {
    const { success, error } = await modifyPlayerBid(playerId, {
      sold: false, sold_to: null, bid_price: null
    });
    if (success) {
      toast({ title: 'Player released', description: 'Player has been released from the team' });
      
      const releasedPlayer = players.find(p => p.id === playerId);
      generateAuctionCommentary({
         event: 'RELEASE',
         playerName: releasedPlayer?.name || 'A player',
         teamName: team.name
      }).then(text => {
         supabase.channel('auction-events').send({
            type: 'broadcast',
            event: 'AI_MEME',
            payload: { text, title: 'Release Drama 🏃‍♂️' }
         });
      });

      supabase.channel('auction-events').send({
         type: 'broadcast',
         event: 'RELEASE',
         payload: { playerId }
      });
      supabase.channel('auction-events').send({
         type: 'broadcast',
         event: 'REFRESH',
         payload: {}
      });
      onTeamUpdated?.();
    } else {
      toast({ title: 'Error releasing player', description: error?.message || 'Unknown error', variant: 'destructive' });
    }
  };
  
  const handleDelete = async () => {
    const { success, error } = await deleteTeam(team.id);
    if (success) {
      toast({ title: 'Team deleted', description: `${name} has been deleted successfully` });
      
      generateAuctionCommentary({
         event: 'TEAM_DELETE',
         teamName: team.name
      }).then(text => {
         supabase.channel('auction-events').send({
            type: 'broadcast',
            event: 'AI_MEME',
            payload: { text, title: 'Team Folded 🌪️' }
         });
      });

      supabase.channel('auction-events').send({
         type: 'broadcast',
         event: 'TEAM_DELETE',
         payload: { teamName: name }
      });
      supabase.channel('auction-events').send({
         type: 'broadcast',
         event: 'REFRESH',
         payload: {}
      });
      onTeamUpdated?.();
    } else {
      toast({ title: 'Error deleting team', description: error?.message || 'Unknown error', variant: 'destructive' });
    }
  };
  
  const handleEdit = async () => {
    const { success, error } = await updateTeam(team.id, { name: editedName });
    if (success) {
      toast({ title: 'Team updated', description: `Team has been updated successfully` });
      setIsEditing(false);
      onTeamUpdated?.();
    } else {
      toast({ title: 'Error updating team', description: error?.message, variant: 'destructive' });
    }
  };
  
  return (
    <div className="glass-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 gradient-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-raised flex items-center justify-center flex-shrink-0">
              <Shield className="h-4.5 w-4.5 text-ink" />
            </div>
            <h3 className="font-display font-bold text-ink truncate">{name}</h3>
          </div>
          
          {isEditable && (
            <div className="flex gap-1 flex-shrink-0">
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:bg-line rounded-xl">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-0">
                  <DialogHeader>
                    <DialogTitle className="font-display">Edit Team</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-name" className="text-xs font-semibold text-ink">Team Name</Label>
                      <Input id="team-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="glass-input rounded-xl h-10" />
                    </div>
                    <Button onClick={handleEdit} className="w-full primary-button">Save Changes</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:bg-red-500/10 hover:text-red-500 rounded-xl">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-dialog border-0">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display">Delete Team</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this team? This action is permanent and will release any currently assigned players.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
      
      {/* Body */}
      <div className="p-4 space-y-3 flex-1">
        {/* Purse Bar */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs font-medium text-soft">Purse Left</span>
            <span className="text-xs font-display font-bold text-ink">{purse} Cr</span>
          </div>
          <div className="h-2 rounded-full bg-raised overflow-hidden">
            <div 
              className="h-full rounded-full bg-tan transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, pursePercentage))}%` }}
            />
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2.5 rounded-xl bg-raised">
            <p className="text-[10px] text-soft font-medium">Points</p>
            <p className="font-display font-bold text-ink">{points}</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-raised">
            <p className="text-[10px] text-soft font-medium">Players</p>
            <p className="font-display font-bold text-ink">{players.length}</p>
          </div>
        </div>
        
        {/* Player List */}
        {showPlayers && players.length > 0 && (
          <div className="pt-2">
            <h4 className="font-display font-semibold text-xs flex items-center gap-1.5 mb-2 text-ink">
              <Users className="h-3.5 w-3.5" />
              Roster
            </h4>
            <div className="space-y-1">
              {players.map((player) => (
                <div key={player.id} className="py-2 px-3 flex justify-between items-center rounded-xl bg-raised hover:bg-line transition-colors">
                  <div className="min-w-0">
                    <span className="font-medium text-sm text-ink truncate block">{player.name}</span>
                    <span className="text-[10px] text-soft">{player.category}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-display font-bold text-ink">{player.bid_price}Cr</span>
                    {isEditable && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button" variant="ghost" size="icon"
                            className="h-7 w-7 text-leather hover:bg-raised hover:text-ink rounded-lg"
                            title="Release player"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-dialog border-0">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-display">Release Player</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to release {player.name}? This will refund the team's purse.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRelievePlayer(player.id)} className="rounded-xl bg-red-500 hover:bg-red-600">Release</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {isPublicView && (
          <div className="pt-2 mt-auto space-y-2">
            {players.length === 0 && purse === initialPurse && (
              <TeamQuote teamId={team.id} pool={QUOTES_SPECTATOR} label="Silent Spectator" />
            )}
            {purse < 15 && players.length > 0 && (
              <TeamQuote teamId={team.id} pool={QUOTES_BANKRUPT} label="Bankrupt Flex" />
            )}
            {players.length >= 2 && purse >= 25 && (
              <TeamQuote teamId={team.id} pool={QUOTES_MASTERMIND} label="Mastermind Steals" />
            )}
            {players.length > 0 && purse >= 15 && purse < 25 && (
              <TeamQuote teamId={team.id} pool={QUOTES_AGGRESSIVE} label="Aggressive Bidders" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamCard;

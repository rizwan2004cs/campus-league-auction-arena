import { Shield, Users, Pencil, Trash2, UserMinus } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Player } from './PlayerCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { deleteTeam, updateTeam, modifyPlayerBid } from '@/services/teamService';

export type Team = {
  id: string;
  name: string;
  purse: number;
  points: number;
  players?: Player[];
};

interface TeamCardProps {
  team: Team;
  initialPurse?: number;
  showPlayers?: boolean;
  onTeamUpdated?: () => void;
}

const TeamCard = ({ 
  team, 
  initialPurse = 50,
  showPlayers = false,
  onTeamUpdated 
}: TeamCardProps) => {
  const { name, purse, points, players = [] } = team;
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const { toast } = useToast();
  
  const pursePercentage = (purse / initialPurse) * 100;
  
  const handleRelievePlayer = async (playerId: string) => {
    if (window.confirm('Are you sure you want to release this player?')) {
      const { success, error } = await modifyPlayerBid(playerId, {
        sold: false,
        sold_to: null,
        bid_price: null
      });
      
      if (success) {
        toast({
          title: 'Player released',
          description: 'Player has been released from the team',
        });
        onTeamUpdated?.();
      } else {
        toast({
          title: 'Error releasing player',
          description: error?.message,
          variant: 'destructive',
        });
      }
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      const { success, error } = await deleteTeam(team.id);
      
      if (success) {
        toast({
          title: 'Team deleted',
          description: `${name} has been deleted successfully`,
        });
        onTeamUpdated?.();
      } else {
        toast({
          title: 'Error deleting team',
          description: error?.message,
          variant: 'destructive',
        });
      }
    }
  };
  
  const handleEdit = async () => {
    const { success, error } = await updateTeam(team.id, { name: editedName });
    
    if (success) {
      toast({
        title: 'Team updated',
        description: `Team has been updated successfully`,
      });
      setIsEditing(false);
      onTeamUpdated?.();
    } else {
      toast({
        title: 'Error updating team',
        description: error?.message,
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="modern-card overflow-hidden">
      <div className="bg-gradient-azure p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-white" />
            <h3 className="text-xl font-bold text-white truncate">{name}</h3>
          </div>
          <div className="flex space-x-2">
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input
                      id="team-name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleEdit} className="w-full">
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Purse Left</span>
            <span className="text-sm font-medium">{purse} Cr</span>
          </div>
          <Progress value={pursePercentage} className="h-2 bg-gradient-bright" />
        </div>
        
        <div className="flex justify-between">
          <div className="glass-card px-3 py-2">
            <span className="text-muted-foreground text-sm">Points:</span>
            <span className="ml-1 font-medium">{points}</span>
          </div>
          
          <div className="glass-card px-3 py-2">
            <span className="text-muted-foreground text-sm">Players:</span>
            <span className="ml-1 font-medium">{players.length}</span>
          </div>
        </div>
        
        {showPlayers && players.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-sm flex items-center mb-2">
              <Users className="h-4 w-4 mr-1" />
              Team Players
            </h4>
            <div className="glass-card divide-y divide-gray-100">
              {players.map((player) => (
                <div key={player.id} className="py-2 px-3 flex justify-between items-center">
                  <div>
                    <span className="font-medium">{player.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {player.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-medium">
                      {player.bid_price} Cr
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:bg-red-50"
                      onClick={() => handleRelievePlayer(player.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamCard;

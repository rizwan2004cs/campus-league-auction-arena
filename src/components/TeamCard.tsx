
import { Shield, Users } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Player } from './PlayerCard';

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
}

const TeamCard = ({ 
  team, 
  initialPurse = 50,
  showPlayers = false
}: TeamCardProps) => {
  const { name, purse, points, players = [] } = team;
  
  const pursePercentage = (purse / initialPurse) * 100;
  
  return (
    <Card className="w-full overflow-hidden transition-all duration-300 hover:shadow-lg">
      <CardHeader className="gradient-header text-white p-4">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6" />
          <h3 className="text-xl font-bold truncate">{name}</h3>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Purse Left</span>
              <span className="text-sm font-medium">{purse} Cr</span>
            </div>
            <Progress value={pursePercentage} className="h-2" />
          </div>
          
          <div className="flex justify-between">
            <div>
              <span className="text-muted-foreground text-sm">Points:</span>
              <span className="ml-1 font-medium">{points}</span>
            </div>
            
            <div>
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
              <ul className="text-sm divide-y">
                {players.map((player) => (
                  <li key={player.id} className="py-2 flex justify-between">
                    <div>
                      <span className="font-medium">{player.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {player.category}
                      </span>
                    </div>
                    <span className="text-green-600 font-medium">
                      {player.bid_price} Cr
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamCard;

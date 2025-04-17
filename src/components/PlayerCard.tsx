
import { User2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type Player = {
  id: string;
  name: string;
  category: 'Bowler' | 'Batter' | 'All-Rounder';
  points: number;
  priority: number;
  base_price: number;
  image_url?: string;
  sold: boolean;
  sold_to?: string;
  bid_price?: number;
};

interface PlayerCardProps {
  player: Player;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  isAuctionCard?: boolean;
}

const CategoryColors = {
  'Bowler': 'bg-green-100 text-green-800',
  'Batter': 'bg-blue-100 text-blue-800',
  'All-Rounder': 'bg-purple-100 text-purple-800',
};

const PlayerCard = ({ 
  player, 
  onDelete, 
  showActions = true,
  isAuctionCard = false
}: PlayerCardProps) => {
  const {
    id,
    name,
    category,
    points,
    priority,
    base_price,
    image_url,
    sold,
    bid_price
  } = player;
  
  return (
    <Card className={`${isAuctionCard ? 'w-full' : 'w-full'} overflow-hidden transition-all duration-300 hover:shadow-lg ${sold ? 'opacity-70' : ''}`}>
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {image_url ? (
          <img 
            src={image_url} 
            alt={name} 
            className="h-full w-full object-cover transition-all hover:scale-105" 
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <User2 className="h-16 w-16 text-gray-400" />
          </div>
        )}
        <Badge className={`absolute top-2 right-2 ${CategoryColors[category]}`}>
          {category}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold truncate">{name}</h3>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Points:</span>
              <span className="ml-1 font-medium">{points}</span>
            </div>
            
            <div>
              <span className="text-muted-foreground">Priority:</span>
              <span className="ml-1 font-medium">{priority}</span>
            </div>
            
            <div className="col-span-2">
              <span className="text-muted-foreground">Base Price:</span>
              <span className="ml-1 font-medium">{base_price} Cr</span>
            </div>
            
            {sold && bid_price && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Sold Price:</span>
                <span className="ml-1 font-medium text-green-600">{bid_price} Cr</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      {showActions && onDelete && (
        <CardFooter className="p-4 pt-0 flex justify-end">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => onDelete(id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default PlayerCard;

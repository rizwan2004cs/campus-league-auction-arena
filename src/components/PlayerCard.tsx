import { useMemo, useState } from 'react'
import { User2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

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

const CategoryStyles: Record<string, string> = {
  'Bowler': 'cat-bowler',
  'Batter': 'cat-batter',
  'All-Rounder': 'cat-allrounder',
};

const PlayerCard = ({ 
  player, 
  onDelete, 
  showActions = true,
  isAuctionCard = false
}: PlayerCardProps) => {
  const { id, name, category, points, priority, base_price, image_url, sold, bid_price } = player;
  
  const [imgError, setImgError] = useState(false);
  const imageSrc = useMemo(() => {
    if (!image_url) return null;
    if (image_url.startsWith('http')) return image_url;
    const { data } = supabase.storage.from('player-images').getPublicUrl(image_url);
    return data.publicUrl || null;
  }, [image_url]);
  
  return (
    <div className={`glass-card overflow-hidden flex flex-col ${sold ? 'opacity-65' : ''}`}>
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#bae6fd]/30 to-[#cee9ff]/30">
        {imageSrc && !imgError ? (
          <img 
            src={imageSrc} 
            alt={name} 
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" 
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <User2 className="h-14 w-14 text-[#93c5fd]" />
          </div>
        )}
        <Badge className={`absolute top-2.5 right-2.5 ${CategoryStyles[category]} border-0 text-xs font-semibold rounded-lg px-2.5 py-1`}>
          {category}
        </Badge>
      </div>
      
      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          <h3 className="font-display font-bold text-[#1e293b] truncate">{name}</h3>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-xl bg-white/40">
              <p className="text-[10px] text-[#475569] font-medium">Points</p>
              <p className="font-display font-bold text-sm text-[#1e293b]">{points}</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-white/40">
              <p className="text-[10px] text-[#475569] font-medium">Priority</p>
              <p className="font-display font-bold text-sm text-[#1e293b]">{priority}</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-white/40">
              <p className="text-[10px] text-[#475569] font-medium">Base</p>
              <p className="font-display font-bold text-sm text-[#1e293b]">{base_price}Cr</p>
            </div>
          </div>
          
          {sold && bid_price && (
            <div className="text-center p-2 rounded-xl bg-[#bae6fd]/30">
              <p className="text-[10px] text-[#475569] font-medium">Sold Price</p>
              <p className="font-display font-bold text-sm text-[#334155]">{bid_price} Cr</p>
            </div>
          )}
        </div>
        
        {showActions && onDelete && (
          <div className="mt-3 pt-3 border-t border-white/30">
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full text-xs text-red-400 hover:text-red-600 hover:bg-red-50/50 rounded-xl font-medium"
              onClick={() => onDelete(id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;

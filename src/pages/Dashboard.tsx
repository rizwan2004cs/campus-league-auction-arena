
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useRequireAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { fetchPublicAuctionData, deletePlayer } from '@/services/teamService';
import PlayerCard, { Player } from '@/components/PlayerCard';
import { ImagePlus, Loader2, PlusCircle, User2 } from 'lucide-react';

const Dashboard = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [categoryCounts, setCategoryCounts] = useState({
    'Bowler': 0,
    'Batter': 0,
    'All-Rounder': 0
  });
  const [loading, setLoading] = useState(true);
  
  // New player form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Bowler' | 'Batter' | 'All-Rounder'>('Bowler');
  const [points, setPoints] = useState(50);
  const [priority, setPriority] = useState(10);
  const [basePrice, setBasePrice] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { players: fetchedPlayers, error } = await fetchPublicAuctionData();
      if (error) throw error;
      setPlayers(fetchedPlayers);
      const counts = { 'Bowler': 0, 'Batter': 0, 'All-Rounder': 0 };
      fetchedPlayers.forEach((player) => {
        counts[player.category as keyof typeof counts]++;
      });
      setCategoryCounts(counts);
    } catch (error: any) {
      toast({ title: 'Error fetching players', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { if (user) fetchPlayers(); }, [user]);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      let imageUrl = null;
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `player_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('player-images').upload(fileName, image);
        if (uploadError) throw uploadError;
        const { data: urlData } = await supabase.storage.from('player-images').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      const { data, error } = await supabase
        .from('players')
        .insert([{ name, category, points, priority, base_price: basePrice, image_url: imageUrl, sold: false }])
        .select();
      if (error) throw error;
      toast({ title: 'Player added', description: `${name} has been added successfully` });
      setName(''); setCategory('Bowler'); setPoints(50); setPriority(10); setBasePrice(1); setImage(null); setImagePreview(null);
      fetchPlayers();
    } catch (error: any) {
      toast({ title: 'Error adding player', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDeletePlayer = async (id: string) => {
    try {
      const player = players.find(p => p.id === id);
      const result = await deletePlayer(id);
      if (!result.success) throw result.error;
      if (player?.image_url) {
        const imagePath = player.image_url.split('/').pop();
        if (imagePath) await supabase.storage.from('player-images').remove([imagePath]);
      }
      toast({ title: 'Player deleted', description: 'Player deleted and team purse restored if applicable' });
      fetchPlayers();
    } catch (error: any) {
      toast({ title: 'Error deleting player', description: error.message, variant: 'destructive' });
    }
  };
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-[#475569]">Loading…</span>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        
        {/* Page Header */}
        <div>
          <h1 className="page-header text-3xl">Player Management</h1>
          <p className="page-subtitle text-sm mt-1">Add, edit, and manage players for the auction</p>
        </div>
        
        {/* Stat Chips */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-chip flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cat-bowler flex items-center justify-center font-display font-bold text-lg">
              {categoryCounts['Bowler']}
            </div>
            <div>
              <p className="font-semibold text-sm text-[#1e293b]">Bowlers</p>
              <p className="text-xs text-[#475569]">In pool</p>
            </div>
          </div>
          
          <div className="stat-chip flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cat-batter flex items-center justify-center font-display font-bold text-lg">
              {categoryCounts['Batter']}
            </div>
            <div>
              <p className="font-semibold text-sm text-[#1e293b]">Batters</p>
              <p className="text-xs text-[#475569]">In pool</p>
            </div>
          </div>
          
          <div className="stat-chip flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cat-allrounder flex items-center justify-center font-display font-bold text-lg">
              {categoryCounts['All-Rounder']}
            </div>
            <div>
              <p className="font-semibold text-sm text-[#1e293b]">All-Rounders</p>
              <p className="text-xs text-[#475569]">In pool</p>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid md:grid-cols-12 gap-6">
          
          {/* Add Player Panel */}
          <div className="md:col-span-4">
            <div className="glass-card p-6 sticky top-4">
              <h2 className="font-display font-bold text-lg text-[#1e293b] flex items-center gap-2 mb-5">
                <PlusCircle className="h-5 w-5 text-[#9b8ec4]" />
                Add New Player
              </h2>
              
              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-[#334155]">Player Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="glass-input rounded-xl h-10" required />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold text-[#334155]">Category</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as any)}>
                    <SelectTrigger id="category" className="glass-input rounded-xl h-10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-0">
                      <SelectItem value="Bowler">Bowler</SelectItem>
                      <SelectItem value="Batter">Batter</SelectItem>
                      <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="points" className="text-xs font-semibold text-[#334155]">Points</Label>
                    <Input id="points" type="number" min={1} max={100} value={points} onChange={(e) => setPoints(parseInt(e.target.value))} className="glass-input rounded-xl h-10" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="priority" className="text-xs font-semibold text-[#334155]">Priority</Label>
                    <Input id="priority" type="number" min={1} max={20} value={priority} onChange={(e) => setPriority(parseInt(e.target.value))} className="glass-input rounded-xl h-10" required />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="basePrice" className="text-xs font-semibold text-[#334155]">Base Price (Cr)</Label>
                  <Input id="basePrice" type="number" min={0} step={0.5} value={basePrice} onChange={(e) => setBasePrice(parseFloat(e.target.value))} className="glass-input rounded-xl h-10" required />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="image" className="text-xs font-semibold text-[#334155]">Player Image</Label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('image')?.click()} className="flex-1 glass-input rounded-xl h-10 text-sm font-medium text-[#334155]">
                      <ImagePlus className="h-4 w-4 mr-2" />
                      {image ? 'Change' : 'Upload'}
                    </Button>
                    <Input id="image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    {imagePreview && (
                      <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/40 shadow-sm">
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                
                <Button type="submit" className="w-full primary-button h-11" disabled={submitting}>
                  {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</>) : 'Add Player'}
                </Button>
              </form>
            </div>
          </div>
          
          {/* Player List */}
          <div className="md:col-span-8">
            <Tabs defaultValue="all">
              <div className="flex justify-between items-center mb-4">
                <TabsList className="glass-card border-0 p-1 h-auto gap-0.5">
                  <TabsTrigger value="all" className="rounded-xl text-xs font-semibold data-[state=active]:bg-white/70 data-[state=active]:shadow-sm px-3 py-1.5">All</TabsTrigger>
                  <TabsTrigger value="bowlers" className="rounded-xl text-xs font-semibold data-[state=active]:bg-white/70 data-[state=active]:shadow-sm px-3 py-1.5">Bowlers</TabsTrigger>
                  <TabsTrigger value="batters" className="rounded-xl text-xs font-semibold data-[state=active]:bg-white/70 data-[state=active]:shadow-sm px-3 py-1.5">Batters</TabsTrigger>
                  <TabsTrigger value="all-rounders" className="rounded-xl text-xs font-semibold data-[state=active]:bg-white/70 data-[state=active]:shadow-sm px-3 py-1.5">All-Rounders</TabsTrigger>
                </TabsList>
                
                <span className="text-xs text-[#475569] font-medium">{players.length} players</span>
              </div>
              
              {['all', 'bowlers', 'batters', 'all-rounders'].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (() => {
                    const filtered = tab === 'all' ? players : players.filter(p => 
                      tab === 'bowlers' ? p.category === 'Bowler' :
                      tab === 'batters' ? p.category === 'Batter' : p.category === 'All-Rounder'
                    );
                    return filtered.length === 0 ? (
                      <div className="glass-card text-center py-16">
                        <User2 className="h-12 w-12 mx-auto text-[#93c5fd]" />
                        <h3 className="mt-4 font-display font-semibold text-[#1e293b]">No players yet</h3>
                        <p className="text-sm text-[#475569]">Add players using the form</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((player) => (
                          <PlayerCard key={player.id} player={player} onDelete={handleDeletePlayer} />
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

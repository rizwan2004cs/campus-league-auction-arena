import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import Pager, { usePaged } from '@/components/Pager';
import { useRequireAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { fetchPublicAuctionData, deletePlayer } from '@/services/teamService';
import PlayerCard, { Player } from '@/components/PlayerCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ImagePlus, Loader2, Plus, Search, User2 } from 'lucide-react';

type CategoryFilter = 'all' | 'Batter' | 'Bowler' | 'All-Rounder';
const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Batter', label: 'Batters' },
  { value: 'Bowler', label: 'Bowlers' },
  { value: 'All-Rounder', label: 'All-rounders' },
];

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
  const [addOpen, setAddOpen] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const listTop = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter(p =>
      (categoryFilter === 'all' || p.category === categoryFilter) &&
      (!q || p.name.toLowerCase().includes(q)),
    );
  }, [players, categoryFilter, search]);
  const paged = usePaged(filtered, 12, `${categoryFilter}|${search}`);

  const fetchPlayers = async () => {
    try {
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
        // Filenames are unique per upload, so the photo can be cached for a year.
        const { error: uploadError } = await supabase.storage
          .from('player-images').upload(fileName, image, { cacheControl: '31536000', contentType: image.type });
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
      setAddOpen(false);
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
        <span className="ml-2 text-soft">Loading…</span>
      </div>
    );
  }
  
  return (
    <div className="">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-header text-3xl">Player Management</h1>
            <p className="page-subtitle text-sm mt-1">Add, edit, and manage players for the auction</p>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <button type="button" className="primary-button inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add player
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[20px] border-line bg-stage p-6 sm:rounded-[20px]">
              <DialogHeader className="text-left">
                <DialogTitle className="font-display text-xl text-ink">Add a player</DialogTitle>
                <DialogDescription className="text-sm text-soft">They join the pool unsold, at their base price.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddPlayer} className="mt-2 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-ink">Player name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="glass-input rounded-xl h-10" required autoFocus />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold text-ink">Category</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
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
                    <Label htmlFor="points" className="text-xs font-semibold text-ink">Points</Label>
                    <Input id="points" type="number" min={1} max={100} value={points} onChange={(e) => setPoints(parseInt(e.target.value))} className="glass-input rounded-xl h-10" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="priority" className="text-xs font-semibold text-ink">Priority</Label>
                    <Input id="priority" type="number" min={1} max={20} value={priority} onChange={(e) => setPriority(parseInt(e.target.value))} className="glass-input rounded-xl h-10" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="basePrice" className="text-xs font-semibold text-ink">Base price (Cr)</Label>
                  <Input id="basePrice" type="number" min={0} step={0.5} value={basePrice} onChange={(e) => setBasePrice(parseFloat(e.target.value))} className="glass-input rounded-xl h-10" required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="image" className="text-xs font-semibold text-ink">Player photo</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image')?.click()}
                    className="glass-input h-14 w-full justify-start gap-3 rounded-xl px-2 text-sm font-medium text-ink"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface">
                        <ImagePlus className="h-4 w-4 text-soft" />
                      </span>
                    )}
                    <span className="min-w-0 truncate">{image ? image.name : 'Upload a photo'}</span>
                    {image && <span className="ml-auto pr-2 text-xs text-soft">Change</span>}
                  </Button>
                  <Input id="image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </div>

                <Button type="submit" className="w-full primary-button h-11" disabled={submitting}>
                  {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</>) : 'Add player'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Stat Chips */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-chip flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cat-bowler flex items-center justify-center font-display font-bold text-lg">
              {categoryCounts['Bowler']}
            </div>
            <div>
              <p className="font-semibold text-sm text-ink">Bowlers</p>
              <p className="text-xs text-soft">In pool</p>
            </div>
          </div>
          
          <div className="stat-chip flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cat-batter flex items-center justify-center font-display font-bold text-lg">
              {categoryCounts['Batter']}
            </div>
            <div>
              <p className="font-semibold text-sm text-ink">Batters</p>
              <p className="text-xs text-soft">In pool</p>
            </div>
          </div>
          
          <div className="stat-chip flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cat-allrounder flex items-center justify-center font-display font-bold text-lg">
              {categoryCounts['All-Rounder']}
            </div>
            <div>
              <p className="font-semibold text-sm text-ink">All-Rounders</p>
              <p className="text-xs text-soft">In pool</p>
            </div>
          </div>
        </div>
        
        {/* Player List */}
        <div ref={listTop}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg bg-surface p-1" role="tablist" aria-label="Category">
              {CATEGORY_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === value}
                  onClick={() => setCategoryFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${categoryFilter === value ? 'bg-raised font-semibold text-ink' : 'text-soft hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players"
                aria-label="Search players"
                className="glass-input h-10 rounded-lg pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-[14px] bg-surface">
                  <div className="skeleton aspect-[4/5]" />
                  <div className="space-y-2 p-4">
                    <div className="skeleton h-5 w-2/3 rounded" />
                    <div className="skeleton h-12 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : paged.total === 0 ? (
            <div className="rounded-[14px] bg-surface px-6 py-16 text-center">
              <User2 className="mx-auto h-10 w-10 text-soft" />
              <h3 className="mt-4 font-semibold text-ink">{players.length === 0 ? 'No players yet' : 'No players match'}</h3>
              <p className="text-sm text-soft">
                {players.length === 0 ? 'Add the first player with the Add player button.' : 'Try another name or category.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {paged.pageItems.map((player, i) => (
                  <PlayerCard key={player.id} player={player} onDelete={handleDeletePlayer} priority={i < 4} />
                ))}
              </div>
              <Pager
                className="mt-6"
                page={paged.page}
                pageCount={paged.pageCount}
                total={paged.total}
                pageSize={paged.pageSize}
                onPage={(p) => { paged.setPage(p); listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

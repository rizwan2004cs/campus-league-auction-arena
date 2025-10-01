
import { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { ImagePlus, Loader2, PlusCircle, User2 } from 'lucide-react';
import { updateAllTeamPurses } from '@/services/teamService';

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
  
  // Fetch players
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      
      const { players: fetchedPlayers, error } = await fetchPublicAuctionData();
      
      if (error) {
        throw error;
      }
      
      setPlayers(fetchedPlayers);
      
      // Calculate category counts
      const counts = {
        'Bowler': 0,
        'Batter': 0,
        'All-Rounder': 0
      };
      
      fetchedPlayers.forEach((player) => {
        counts[player.category as keyof typeof counts]++;
      });
      
      setCategoryCounts(counts);
    } catch (error: any) {
      toast({
        title: 'Error fetching players',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (user) {
      fetchPlayers();
    }
  }, [user]);
  
  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Add player
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      let imageUrl = null;
      
      // Upload image if selected
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `player_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('player-images')
          .upload(fileName, image);
          
        if (uploadError) {
          throw uploadError;
        }
        
        // Get public URL
        const { data: urlData } = await supabase.storage
          .from('player-images')
          .getPublicUrl(fileName);
          
        imageUrl = urlData.publicUrl;
      }
      
      // Add player to database
      const { data, error } = await supabase
        .from('players')
        .insert([
          { 
            name, 
            category, 
            points, 
            priority, 
            base_price: basePrice,
            image_url: imageUrl,
            sold: false
          }
        ])
        .select();
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Player added',
        description: `${name} has been added successfully`,
      });
      
      // Reset form
      setName('');
      setCategory('Bowler');
      setPoints(50);
      setPriority(10);
      setBasePrice(1);
      setImage(null);
      setImagePreview(null);
      
      // Refresh players
      fetchPlayers();
    } catch (error: any) {
      toast({
        title: 'Error adding player',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Delete player
  const handleDeletePlayer = async (id: string) => {
    try {
      // Find player to get image URL
      const player = players.find(p => p.id === id);
      
      // Delete player and handle team purse restoration
      const result = await deletePlayer(id);
      
      if (!result.success) {
        throw result.error;
      }
      
      // Delete image if exists
      if (player?.image_url) {
        const imagePath = player.image_url.split('/').pop();
        if (imagePath) {
          await supabase.storage
            .from('player-images')
            .remove([imagePath]);
        }
      }
      
      toast({
        title: 'Player deleted',
        description: 'Player deleted and team purse restored if applicable',
      });
      
      // Refresh players list
      fetchPlayers();
    } catch (error: any) {
      toast({
        title: 'Error deleting player',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Player Management</h1>
        <p className="text-muted-foreground">Add, edit, and manage players for the auction</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card-with-shadow flex items-center space-x-4">
          <Badge variant="outline" className="bg-green-100 text-green-800 px-3 py-1 text-lg">
            {categoryCounts['Bowler']}
          </Badge>
          <div>
            <h3 className="font-medium">Bowlers</h3>
            <p className="text-sm text-muted-foreground">Total in pool</p>
          </div>
        </div>
        
        <div className="card-with-shadow flex items-center space-x-4">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 px-3 py-1 text-lg">
            {categoryCounts['Batter']}
          </Badge>
          <div>
            <h3 className="font-medium">Batters</h3>
            <p className="text-sm text-muted-foreground">Total in pool</p>
          </div>
        </div>
        
        <div className="card-with-shadow flex items-center space-x-4">
          <Badge variant="outline" className="bg-purple-100 text-purple-800 px-3 py-1 text-lg">
            {categoryCounts['All-Rounder']}
          </Badge>
          <div>
            <h3 className="font-medium">All-Rounders</h3>
            <p className="text-sm text-muted-foreground">Total in pool</p>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-12 gap-8">
        <div className="md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PlusCircle className="h-5 w-5 mr-2" />
                Add New Player
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Player Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={category} 
                    onValueChange={(value) => setCategory(value as any)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bowler">Bowler</SelectItem>
                      <SelectItem value="Batter">Batter</SelectItem>
                      <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points">Points (1-100)</Label>
                    <Input 
                      id="points" 
                      type="number" 
                      min={1} 
                      max={100} 
                      value={points}
                      onChange={(e) => setPoints(parseInt(e.target.value))}
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority (1-20)</Label>
                    <Input 
                      id="priority" 
                      type="number" 
                      min={1} 
                      max={20} 
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value))}
                      required 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price (Cr)</Label>
                  <Input 
                    id="basePrice" 
                    type="number" 
                    min={0} 
                    step={0.5} 
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value))}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="image">Player Image</Label>
                  <div className="flex items-center space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => document.getElementById('image')?.click()}
                      className="flex-1"
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      {image ? 'Change Image' : 'Upload Image'}
                    </Button>
                    <Input 
                      id="image" 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    
                    {imagePreview && (
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Player'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-8">
          <Tabs defaultValue="all">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="all">All Players</TabsTrigger>
                <TabsTrigger value="bowlers">Bowlers</TabsTrigger>
                <TabsTrigger value="batters">Batters</TabsTrigger>
                <TabsTrigger value="all-rounders">All-Rounders</TabsTrigger>
              </TabsList>
              
              <div className="text-sm text-muted-foreground">
                Total: {players.length} players
              </div>
            </div>
            
            <TabsContent value="all">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                  <User2 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No players added yet</h3>
                  <p className="text-muted-foreground">Add players using the form on the left</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {players.map((player) => (
                    <PlayerCard 
                      key={player.id} 
                      player={player} 
                      onDelete={handleDeletePlayer} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="bowlers">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : players.filter(p => p.category === 'Bowler').length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                  <h3 className="mt-4 text-lg font-medium">No bowlers added yet</h3>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {players
                    .filter(player => player.category === 'Bowler')
                    .map((player) => (
                      <PlayerCard 
                        key={player.id} 
                        player={player} 
                        onDelete={handleDeletePlayer} 
                      />
                    ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="batters">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : players.filter(p => p.category === 'Batter').length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                  <h3 className="mt-4 text-lg font-medium">No batters added yet</h3>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {players
                    .filter(player => player.category === 'Batter')
                    .map((player) => (
                      <PlayerCard 
                        key={player.id} 
                        player={player} 
                        onDelete={handleDeletePlayer} 
                      />
                    ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="all-rounders">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : players.filter(p => p.category === 'All-Rounder').length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                  <h3 className="mt-4 text-lg font-medium">No all-rounders added yet</h3>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {players
                    .filter(player => player.category === 'All-Rounder')
                    .map((player) => (
                      <PlayerCard 
                        key={player.id} 
                        player={player} 
                        onDelete={handleDeletePlayer} 
                      />
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

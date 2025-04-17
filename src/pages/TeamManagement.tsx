
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
import { useToast } from '@/components/ui/use-toast';
import { useRequireAuth } from '@/lib/auth';
import supabase from '@/lib/supabase';
import TeamCard, { Team } from '@/components/TeamCard';
import { Loader2, PlusCircle, RefreshCw, Shield } from 'lucide-react';

const TeamManagement = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New team form state
  const [name, setName] = useState('');
  const [purse, setPurse] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  
  // Purse update form state
  const [globalPurse, setGlobalPurse] = useState(50);
  const [updatingPurse, setUpdatingPurse] = useState(false);
  
  // Fetch teams
  const fetchTeams = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
        
      if (error) {
        throw error;
      }
      
      setTeams(data || []);
      
      // Set initial purse from settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('initial_purse')
        .limit(1)
        .single();
        
      if (settingsData) {
        setPurse(settingsData.initial_purse);
        setGlobalPurse(settingsData.initial_purse);
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching teams',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);
  
  // Add team
  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Add team to database
      const { data, error } = await supabase
        .from('teams')
        .insert([{ name, purse, points: 0 }])
        .select();
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Team added',
        description: `${name} has been added successfully`,
      });
      
      // Reset form
      setName('');
      
      // Refresh teams
      fetchTeams();
    } catch (error: any) {
      toast({
        title: 'Error adding team',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Update all purses
  const handleUpdateAllPurses = async () => {
    try {
      setUpdatingPurse(true);
      
      // Update all teams
      const { error } = await supabase
        .from('teams')
        .update({ purse: globalPurse })
        .neq('id', '');
        
      if (error) {
        throw error;
      }
      
      // Update settings
      await supabase
        .from('settings')
        .update({ initial_purse: globalPurse })
        .eq('id', '');
      
      toast({
        title: 'Purses updated',
        description: `All teams now have ${globalPurse} Cr purse`,
      });
      
      // Refresh teams
      fetchTeams();
    } catch (error: any) {
      toast({
        title: 'Error updating purses',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingPurse(false);
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
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">Add and manage teams for the auction</p>
      </div>
      
      <div className="grid md:grid-cols-12 gap-8">
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PlusCircle className="h-5 w-5 mr-2" />
                Add New Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="purse">Initial Purse (Cr)</Label>
                  <Input 
                    id="purse" 
                    type="number" 
                    min={0} 
                    step={0.5} 
                    value={purse}
                    onChange={(e) => setPurse(parseFloat(e.target.value))}
                    required 
                  />
                  <p className="text-xs text-muted-foreground">
                    Default purse for newly added teams
                  </p>
                </div>
                
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Team'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Update All Purses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="globalPurse">New Purse Value (Cr)</Label>
                  <Input 
                    id="globalPurse" 
                    type="number" 
                    min={0} 
                    step={0.5} 
                    value={globalPurse}
                    onChange={(e) => setGlobalPurse(parseFloat(e.target.value))}
                    required 
                  />
                  <p className="text-xs text-muted-foreground">
                    This will update all teams' purses to this value
                  </p>
                </div>
                
                <Button 
                  className="w-full" 
                  variant="outline"
                  disabled={updatingPurse}
                  onClick={handleUpdateAllPurses}
                >
                  {updatingPurse ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update All Teams'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Teams
            </h2>
            
            <div className="text-sm text-muted-foreground">
              Total: {teams.length} teams
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No teams added yet</h3>
              <p className="text-muted-foreground">Add teams using the form on the left</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {teams.map((team) => (
                <TeamCard 
                  key={team.id} 
                  team={team} 
                  initialPurse={purse}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;

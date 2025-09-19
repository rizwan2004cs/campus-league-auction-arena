
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRequireAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Settings = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  
  const [playersPerTeam, setPlayersPerTeam] = useState(2);
  const [initialPurse, setInitialPurse] = useState(50);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1);
        
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        setSettingsId(data[0].id);
        setPlayersPerTeam(data[0].players_per_team);
        setInitialPurse(data[0].initial_purse);
      } else {
        // If no settings exist, create default
        const { data: newData, error: insertError } = await supabase
          .from('settings')
          .insert([
            { 
              players_per_team: 2, 
              initial_purse: 50 
            }
          ])
          .select();
          
        if (insertError) {
          throw insertError;
        }
        
        if (newData && newData.length > 0) {
          setSettingsId(newData[0].id);
          setPlayersPerTeam(newData[0].players_per_team);
          setInitialPurse(newData[0].initial_purse);
        }
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setError(`Error fetching settings: ${error.message}`);
      toast({
        title: 'Error fetching settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!authLoading) {
      fetchSettings();
    }
  }, [authLoading]);
  
  // Save settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      if (!settingsId) {
        // Create new settings
        const { error } = await supabase
          .from('settings')
          .insert([
            { 
              players_per_team: playersPerTeam, 
              initial_purse: initialPurse 
            }
          ]);
          
        if (error) {
          throw error;
        }
      } else {
        // Update existing settings
        const { error } = await supabase
          .from('settings')
          .update({ 
            players_per_team: playersPerTeam, 
            initial_purse: initialPurse 
          })
          .eq('id', settingsId);
          
        if (error) {
          throw error;
        }
      }
      
      // Also update all teams to have the new initial purse
      const { error: updateTeamsError } = await supabase
        .from('teams')
        .update({ purse: initialPurse })
        .gte('id', '00000000-0000-0000-0000-000000000000');
        
      if (updateTeamsError) {
        console.error('Error updating team purses:', updateTeamsError);
        // Don't throw here, just show a warning
        toast({
          title: 'Warning',
          description: 'Settings saved, but team purses could not be updated.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Settings saved',
          description: 'Auction settings have been updated and all team purses have been reset.',
        });
      }
      
      // Refresh settings to get the latest data
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setError(`Error saving settings: ${error.message}`);
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Auction Settings</h1>
        <p className="text-muted-foreground">Configure auction parameters</p>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2" />
            Auction Configuration
          </CardTitle>
          <CardDescription>
            Adjust these settings to control the auction behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="playersPerTeam">Players Per Team (Per Category)</Label>
              <Input 
                id="playersPerTeam" 
                type="number" 
                min={1} 
                max={10} 
                value={playersPerTeam}
                onChange={(e) => setPlayersPerTeam(parseInt(e.target.value))}
                required 
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of players per category (Bowler, Batter, All-Rounder) that each team can have
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="initialPurse">Initial Purse (Cr)</Label>
              <Input 
                id="initialPurse" 
                type="number" 
                min={1} 
                step={0.5} 
                value={initialPurse}
                onChange={(e) => setInitialPurse(parseFloat(e.target.value))}
                required 
              />
              <p className="text-xs text-muted-foreground">
                Starting purse amount for new teams (in Crores)
              </p>
            </div>
            
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Note: Changing these settings will affect future auctions only.</p>
        <p>To update existing teams' purses, use the Team Management page.</p>
      </div>
    </div>
  );
};

export default Settings;

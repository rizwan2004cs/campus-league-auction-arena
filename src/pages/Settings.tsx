
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRequireAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
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

const Settings = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  
  const [playersPerTeam, setPlayersPerTeam] = useState(2);
  const [initialPurse, setInitialPurse] = useState(50);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('settings').select('*').limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        setSettingsId(data[0].id);
        setPlayersPerTeam(data[0].players_per_team);
        setInitialPurse(data[0].initial_purse);
      } else {
        const { data: newData, error: insertError } = await supabase
          .from('settings').insert([{ players_per_team: 2, initial_purse: 50 }]).select();
        if (insertError) throw insertError;
        if (newData && newData.length > 0) {
          setSettingsId(newData[0].id);
          setPlayersPerTeam(newData[0].players_per_team);
          setInitialPurse(newData[0].initial_purse);
        }
      }
    } catch (error: any) {
      setError(`Error fetching settings: ${error.message}`);
      toast({ title: 'Error fetching settings', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { if (!authLoading) fetchSettings(); }, [authLoading]);
  
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); setError(null);
      if (!settingsId) {
        const { error } = await supabase.from('settings').insert([{ players_per_team: playersPerTeam, initial_purse: initialPurse }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('settings').update({ players_per_team: playersPerTeam, initial_purse: initialPurse }).eq('id', settingsId);
        if (error) throw error;
      }
      const { error: updateTeamsError } = await supabase.from('teams').update({ purse: initialPurse }).gte('id', '00000000-0000-0000-0000-000000000000');
      if (updateTeamsError) {
        toast({ title: 'Warning', description: 'Settings saved, but team purses could not be updated.' });
      } else {
        toast({ title: 'Settings saved', description: 'Auction settings updated and team purses reset.' });
      }
      fetchSettings();
    } catch (error: any) {
      setError(`Error saving settings: ${error.message}`);
      toast({ title: 'Error saving settings', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetAuction = async () => {
    try {
      setResetting(true);
      const { data, error } = await supabase.functions.invoke('reset-auction', {
        body: {},
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (error) throw error;
      toast({ title: 'Auction reset', description: 'All players released and team purses reset.' });
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Reset failed',
        description: err?.message || err?.context || 'Failed to reset',
        variant: 'destructive',
      });
    } finally {
      setResetting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-soft">Loading settings…</span>
      </div>
    );
  }
  
  return (
    <div className="">
      <div className="max-w-xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div>
          <h1 className="page-header text-3xl">Settings</h1>
          <p className="page-subtitle text-sm mt-1">Configure auction parameters</p>
        </div>
        
        {error && (
          <div className="glass-card p-4 border-red-300/40 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-leather flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {/* Configuration Card */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-raised flex items-center justify-center">
              <SettingsIcon className="h-4.5 w-4.5 text-ink" />
            </div>
            <div>
              <h2 className="font-display font-bold text-ink">Auction Configuration</h2>
              <p className="text-xs text-soft">Adjust these settings to control auction behavior</p>
            </div>
          </div>
          
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="playersPerTeam" className="text-xs font-semibold text-ink">Players Per Team (Per Category)</Label>
              <Input id="playersPerTeam" type="number" min={1} max={10} value={playersPerTeam} onChange={(e) => setPlayersPerTeam(parseInt(e.target.value))} className="glass-input rounded-xl h-11" required />
              <p className="text-[11px] text-soft">Maximum players per category each team can have</p>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="initialPurse" className="text-xs font-semibold text-ink">Initial Purse (Cr)</Label>
              <Input id="initialPurse" type="number" min={1} step={0.5} value={initialPurse} onChange={(e) => setInitialPurse(parseFloat(e.target.value))} className="glass-input rounded-xl h-11" required />
              <p className="text-[11px] text-soft">Starting purse for new teams (in Crores)</p>
            </div>
            
            <Button type="submit" className="w-full primary-button h-11" disabled={saving}>
              {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>) : (<><Save className="mr-2 h-4 w-4" />Save Settings</>)}
            </Button>
          </form>
        </div>
        
        {/* Danger Zone */}
        <div className="glass-card p-6 border-red-300/30">
          <h2 className="font-display font-bold text-ink mb-1">Danger Zone</h2>
          <p className="text-xs text-soft mb-4">Reset the entire auction: releases all players and restores team purses.</p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full rounded-xl h-11 font-semibold" 
                disabled={resetting}
              >
                {resetting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting…</>) : 'Reset Auction'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">Reset Auction</AlertDialogTitle>
                <AlertDialogDescription>
                  This will release all players, clear team rosters, and reset all team purses. Proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAuction} className="rounded-xl bg-red-500 hover:bg-red-600">Proceed</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="mt-2 text-[10px] text-soft text-center">This action cannot be undone.</p>
        </div>
        
        <p className="text-center text-[11px] text-soft pb-4">
          Note: Changes affect future auctions. Use Team Management to update existing purses.
        </p>
      </div>
    </div>
  );
};

export default Settings;


import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Team } from '@/components/TeamCard';
import { fetchTeams } from '@/services/teamService';
import { Loader2 } from 'lucide-react';
import TeamForm from '@/components/team/TeamForm';
import PurseUpdater from '@/components/team/PurseUpdater';
import TeamList from '@/components/team/TeamList';

const TeamManagement = () => {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialPurse, setInitialPurse] = useState(50);
  
  const loadTeams = async () => {
    try {
      setLoading(true);
      const { teams: fetchedTeams, initialPurse: fetchedPurse, error } = await fetchTeams();
      if (error) throw error;
      setTeams(fetchedTeams);
      setInitialPurse(fetchedPurse);
    } catch (error: any) {
      toast({ title: 'Error fetching teams', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { if (user) loadTeams(); }, [user]);
  
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
        <div>
          <h1 className="page-header text-3xl">Team Management</h1>
          <p className="page-subtitle text-sm mt-1">Add and manage teams for the auction</p>
        </div>
        
        <div className="grid md:grid-cols-12 gap-6">
          <div className="md:col-span-4 space-y-4">
            <div className="glass-card p-6">
              <TeamForm 
                onTeamAdded={loadTeams} 
                initialPurse={initialPurse}
                userId={user?.id}
              />
            </div>
            
            <div className="glass-card p-6">
              <PurseUpdater 
                initialValue={initialPurse} 
                onUpdate={loadTeams} 
              />
            </div>
          </div>
          
          <div className="md:col-span-8">
            <TeamList 
              teams={teams} 
              loading={loading} 
              initialPurse={initialPurse} 
              onTeamUpdated={loadTeams}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;


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
  
  // Fetch teams
  const loadTeams = async () => {
    try {
      setLoading(true);
      
      const { teams: fetchedTeams, initialPurse: fetchedPurse, error } = await fetchTeams();
      
      if (error) {
        throw error;
      }
      
      setTeams(fetchedTeams);
      setInitialPurse(fetchedPurse);
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
      loadTeams();
    }
  }, [user]);
  
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
          <TeamForm 
            onTeamAdded={loadTeams} 
            initialPurse={initialPurse}
            userEmail={user?.email}
          />
          
          <PurseUpdater 
            initialValue={initialPurse} 
            onUpdate={loadTeams} 
          />
        </div>
        
        <div className="md:col-span-8">
          <TeamList 
            teams={teams} 
            loading={loading} 
            initialPurse={initialPurse} 
          />
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;

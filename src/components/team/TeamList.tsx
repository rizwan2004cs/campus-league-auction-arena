
import { Shield, Loader2 } from 'lucide-react';
import TeamCard, { Team } from '@/components/TeamCard';

interface TeamListProps {
  teams: Team[];
  loading: boolean;
  initialPurse: number;
  onTeamUpdated: () => void;
}

const TeamList = ({ teams, loading, initialPurse, onTeamUpdated }: TeamListProps) => {
  return (
    <div>
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
              initialPurse={initialPurse}
              onTeamUpdated={onTeamUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamList;

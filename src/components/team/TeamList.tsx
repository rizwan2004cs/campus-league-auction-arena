
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
        <h2 className="font-display font-bold text-[#1e293b] text-xl flex items-center">
          <Shield className="h-5 w-5 mr-2 text-[#a78bfa]" />
          Teams
        </h2>
        
        <div className="text-sm font-semibold text-[#475569]">
          Total: {teams.length} teams
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff8787]" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <Shield className="h-12 w-12 mx-auto text-[#ffeed9]" />
          <h3 className="mt-4 text-lg font-display font-bold text-[#1e293b]">No teams added yet</h3>
          <p className="text-sm text-[#475569]">Add teams using the form on the left</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {teams.map((team) => (
            <TeamCard 
              key={team.id} 
              team={team} 
              initialPurse={initialPurse}
              isEditable={true}
              showPlayers={true}
              onTeamUpdated={onTeamUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamList;


import supabase from '@/lib/supabase';
import { Team } from '@/components/TeamCard';

export const fetchTeams = async (): Promise<{ 
  teams: Team[]; 
  initialPurse: number; 
  error: Error | null;
}> => {
  try {
    // Fetch teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('name');
      
    if (teamsError) {
      throw teamsError;
    }
    
    // Fetch initial purse from settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('initial_purse')
      .limit(1)
      .single();
      
    const initialPurse = settingsData?.initial_purse || 50;
    
    return {
      teams: teamsData || [],
      initialPurse,
      error: null
    };
  } catch (error: any) {
    return {
      teams: [],
      initialPurse: 50,
      error
    };
  }
};

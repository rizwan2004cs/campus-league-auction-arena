
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
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('initial_purse')
      .limit(1)
      .single();
      
    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      // Return default value if settings not found
      return {
        teams: teamsData || [],
        initialPurse: 50, // Default initial purse
        error: null
      };
    }
      
    const initialPurse = settingsData?.initial_purse || 50;
    
    return {
      teams: teamsData || [],
      initialPurse,
      error: null
    };
  } catch (error: any) {
    console.error('Error in fetchTeams:', error);
    return {
      teams: [],
      initialPurse: 50, // Default initial purse
      error
    };
  }
};

// Fix the team purse update function to use WHERE clause
export const updateAllTeamPurses = async (amount: number): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Update all teams with a proper WHERE clause
    const { error: teamsError } = await supabase
      .from('teams')
      .update({ purse: amount })
      .gte('id', '00000000-0000-0000-0000-000000000000'); // This will update all teams
      
    if (teamsError) {
      throw teamsError;
    }
    
    // Update settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
      .single();
    
    if (settingsError) {
      // Create settings if it doesn't exist
      const { error: insertError } = await supabase
        .from('settings')
        .insert([{ initial_purse: amount, players_per_team: 2 }]);
        
      if (insertError) {
        throw insertError;
      }
    } else {
      // Update existing settings
      const { error: updateError } = await supabase
        .from('settings')
        .update({ initial_purse: amount })
        .eq('id', settingsData.id);
        
      if (updateError) {
        throw updateError;
      }
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating purses:', error);
    return { success: false, error };
  }
};

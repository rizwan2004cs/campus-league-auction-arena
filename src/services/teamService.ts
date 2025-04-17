
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

// Fix the team purse update function
export const updateAllTeamPurses = async (amount: number): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Update all teams
    const { error: teamsError } = await supabase
      .from('teams')
      .update({ purse: amount });
      
    if (teamsError) {
      throw teamsError;
    }
    
    // Update settings
    const { error: settingsError } = await supabase
      .from('settings')
      .update({ initial_purse: amount })
      .eq('id', ''); // This will update all records since we're not specifying a specific ID
    
    if (settingsError) {
      // Try to create settings if update fails
      const { error: insertError } = await supabase
        .from('settings')
        .insert([{ initial_purse: amount, players_per_team: 2 }]);
        
      if (insertError) {
        throw insertError;
      }
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating purses:', error);
    return { success: false, error };
  }
};


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

// Update the team purse update function to reset players and points
export const updateAllTeamPurses = async (amount: number): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // First, remove all team_players associations
    const { error: deletePlayersError } = await supabase
      .from('team_players')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // This will delete all team players
      
    if (deletePlayersError) {
      console.error('Error removing team players:', deletePlayersError);
      // Continue anyway - we'll still update the purses
    }
    
    // Update all teams with reset points and the new purse
    const { error: teamsError } = await supabase
      .from('teams')
      .update({ 
        purse: amount,
        points: 0 // Reset points when updating purse
      })
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

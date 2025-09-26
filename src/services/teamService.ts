import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/components/TeamCard';
import { Player } from '@/components/PlayerCard';
import type { Database } from '@/integrations/supabase/types';

type DbPlayer = Database['public']['Tables']['players']['Row'];
type DbTeam = Database['public']['Tables']['teams']['Row'];

// Helper function to transform database player to component player
const transformDbPlayerToPlayer = (dbPlayer: DbPlayer, teamName?: string): Player => {
  return {
    id: dbPlayer.id,
    name: dbPlayer.name,
    category: dbPlayer.category as 'Bowler' | 'Batter' | 'All-Rounder',
    points: dbPlayer.points,
    priority: dbPlayer.priority,
    base_price: dbPlayer.base_price,
    sold: !!dbPlayer.team_id,
    sold_to: teamName || undefined,
    bid_price: dbPlayer.sold_price || undefined,
    image_url: undefined // Not in DB schema yet
  };
};

// Helper function to transform database team to component team
const transformDbTeamToTeam = (dbTeam: DbTeam, players?: Player[]): Team => {
  return {
    id: dbTeam.id,
    name: dbTeam.name,
    purse: dbTeam.purse,
    points: dbTeam.points,
    players: players || []
  };
};

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
      .maybeSingle();
      
    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
    }
      
    const initialPurse = settingsData?.initial_purse || 50;
    const teams = (teamsData || []).map(dbTeam => transformDbTeamToTeam(dbTeam));
    
    return {
      teams,
      initialPurse,
      error: null
    };
  } catch (error: any) {
    console.error('Error in fetchTeams:', error);
    return {
      teams: [],
      initialPurse: 50,
      error
    };
  }
};

export const updateAllTeamPurses = async (amount: number): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Reset all players - remove team associations
    const { error: resetPlayersError } = await supabase
      .from('players')
      .update({ 
        team_id: null,
        sold_price: null
      })
      .not('team_id', 'is', null);
      
    if (resetPlayersError) {
      console.error('Error resetting players:', resetPlayersError);
    }
    
    // Update all teams with reset points and the new purse
    const { error: teamsError } = await supabase
      .from('teams')
      .update({ 
        purse: amount,
        points: 0
      })
      .gte('id', '00000000-0000-0000-0000-000000000000');
      
    if (teamsError) {
      throw teamsError;
    }
    
    // Update settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (settingsError || !settingsData) {
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

export const deleteTeam = async (teamId: string): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Reset players that belong to this team
    const { error: resetPlayersError } = await supabase
      .from('players')
      .update({ 
        team_id: null,
        sold_price: null
      })
      .eq('team_id', teamId);
      
    if (resetPlayersError) {
      throw resetPlayersError;
    }
    
    // Delete the team
    const { error: deleteTeamError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);
      
    if (deleteTeamError) {
      throw deleteTeamError;
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error deleting team:', error);
    return { success: false, error };
  }
};

export const updateTeam = async (
  teamId: string, 
  updates: { name?: string; purse?: number }
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId);
      
    if (error) {
      throw error;
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating team:', error);
    return { success: false, error };
  }
};

export const modifyPlayerBid = async (
  playerId: string,
  updates: { 
    sold?: boolean; 
    sold_to?: string | null; 
    bid_price?: number | null;
  }
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Get current player data
    const { data: playerData, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
      
    if (fetchError) {
      throw fetchError;
    }
    
    // If player was previously sold, restore purse to old team
    if (playerData.team_id && playerData.sold_price) {
      // Get current team data and calculate new values
      const { data: currentTeamData, error: getTeamError } = await supabase
        .from('teams')
        .select('purse, points')
        .eq('id', playerData.team_id)
        .single();
        
      if (getTeamError) {
        throw getTeamError;
      }
      
      const { error: restorePurseError } = await supabase
        .from('teams')
        .update({ 
          purse: currentTeamData.purse + playerData.sold_price,
          points: currentTeamData.points - playerData.points
        })
        .eq('id', playerData.team_id);
        
      if (restorePurseError) {
        throw restorePurseError;
      }
    }
    
    // If selling to new team
    if (updates.sold && updates.sold_to && updates.bid_price) {
      // Get current team data and calculate new values
      const { data: currentTeamData, error: getTeamError } = await supabase
        .from('teams')
        .select('purse, points')
        .eq('id', updates.sold_to)
        .single();
        
      if (getTeamError) {
        throw getTeamError;
      }
      
      if (currentTeamData.purse < updates.bid_price) {
        return { 
          success: false, 
          error: new Error(`Team doesn't have enough purse (${currentTeamData.purse} Cr) for this bid (${updates.bid_price} Cr)`) 
        };
      }
      
      // Update team purse and points
      const { error: updateTeamError } = await supabase
        .from('teams')
        .update({ 
          purse: currentTeamData.purse - updates.bid_price,
          points: currentTeamData.points + playerData.points
        })
        .eq('id', updates.sold_to);
        
      if (updateTeamError) {
        throw updateTeamError;
      }
      
      // Update player
      const { error: updatePlayerError } = await supabase
        .from('players')
        .update({
          team_id: updates.sold_to,
          sold_price: updates.bid_price
        })
        .eq('id', playerId);
        
      if (updatePlayerError) {
        throw updatePlayerError;
      }
    } else {
      // Reset player (unsold)
      const { error: updatePlayerError } = await supabase
        .from('players')
        .update({
          team_id: null,
          sold_price: null
        })
        .eq('id', playerId);
        
      if (updatePlayerError) {
        throw updatePlayerError;
      }
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error modifying player bid:', error);
    return { success: false, error };
  }
};

export const fetchTeamWithPlayers = async (teamId: string): Promise<{
  team: Team | null;
  players: Player[];
  error: Error | null;
}> => {
  try {
    // Fetch team
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
      
    if (teamError) {
      throw teamError;
    }
    
    // Fetch players for this team
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId);
      
    if (playersError) {
      throw playersError;
    }
    
    const players = (playersData || []).map(dbPlayer => 
      transformDbPlayerToPlayer(dbPlayer, teamData.name)
    );
    
    const team = transformDbTeamToTeam(teamData, players);
    
    return {
      team,
      players,
      error: null
    };
  } catch (error: any) {
    console.error('Error fetching team with players:', error);
    return {
      team: null,
      players: [],
      error
    };
  }
};

export const fetchPublicAuctionData = async (): Promise<{
  players: Player[];
  teams: Team[];
  categoryCounts: Record<string, number>;
  error: Error | null;
}> => {
  try {
    // Fetch all players
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .order('priority', { ascending: true });
    
    if (playersError) {
      throw playersError;
    }
    
    // Fetch all teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('points', { ascending: false });
    
    if (teamsError) {
      throw teamsError;
    }
    
    // Create team name lookup
    const teamNameMap = new Map(
      (teamsData || []).map(team => [team.id, team.name])
    );
    
    // Transform players
    const players = (playersData || []).map(dbPlayer => 
      transformDbPlayerToPlayer(
        dbPlayer, 
        dbPlayer.team_id ? teamNameMap.get(dbPlayer.team_id) : undefined
      )
    );
    
    // Group players by team and transform teams
    const teamsWithPlayers = (teamsData || []).map(dbTeam => {
      const teamPlayers = players.filter(player => player.sold_to === dbTeam.name);
      return transformDbTeamToTeam(dbTeam, teamPlayers);
    });
    
    // Calculate category counts (unsold players only)
    const categoryCounts: Record<string, number> = {
      'Bowler': 0,
      'Batter': 0,
      'All-Rounder': 0
    };
    
    players.filter(player => !player.sold).forEach(player => {
      if (categoryCounts[player.category] !== undefined) {
        categoryCounts[player.category]++;
      }
    });
    
    return {
      players,
      teams: teamsWithPlayers,
      categoryCounts,
      error: null
    };
  } catch (error: any) {
    console.error('Error fetching public auction data:', error);
    return {
      players: [],
      teams: [],
      categoryCounts: {
        'Bowler': 0,
        'Batter': 0,
        'All-Rounder': 0
      },
      error
    };
  }
};
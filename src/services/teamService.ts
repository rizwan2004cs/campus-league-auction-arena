import supabase from '@/lib/supabase';
import { Team } from '@/components/TeamCard';
import { Player } from '@/components/PlayerCard';

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
    
    // Reset player sold status when resetting teams
    const { error: resetPlayersError } = await supabase
      .from('players')
      .update({ 
        sold: false,
        sold_to: null,
        bid_price: null
      })
      .eq('sold', true);
      
    if (resetPlayersError) {
      console.error('Error resetting players:', resetPlayersError);
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

// New function to delete a team
export const deleteTeam = async (teamId: string): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // First delete all team_players associations
    const { error: deletePlayersError } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', teamId);
      
    if (deletePlayersError) {
      throw deletePlayersError;
    }
    
    // Reset player sold status for players associated with this team
    const { error: resetPlayersError } = await supabase
      .from('players')
      .update({ 
        sold: false,
        sold_to: null,
        bid_price: null
      })
      .eq('sold_to', teamId);
      
    if (resetPlayersError) {
      throw resetPlayersError;
    }
    
    // Then delete the team
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

// New function to update a team
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

// Function to modify player bid or mark as unsold
export const modifyPlayerBid = async (
  playerId: string,
  updates: { 
    sold?: boolean; 
    sold_to?: string | null; 
    bid_price?: number | null;
  }
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // First get the current player data
    const { data: playerData, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
      
    if (fetchError) {
      throw fetchError;
    }
    
    // If player was previously sold to a team, remove the association
    if (playerData.sold && playerData.sold_to) {
      // Delete the team_player association
      const { error: deleteAssocError } = await supabase
        .from('team_players')
        .delete()
        .eq('player_id', playerId);
        
      if (deleteAssocError) {
        throw deleteAssocError;
      }
      
      // If player was previously sold, restore the purse to the original team
      if (playerData.bid_price && playerData.sold_to) {
        const { error: updatePurseError } = await supabase
          .from('teams')
          .select('purse, points')
          .eq('id', playerData.sold_to)
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            
            // Also subtract player points from team
            return supabase
              .from('teams')
              .update({ 
                purse: data.purse + playerData.bid_price,
                points: data.points - playerData.points 
              })
              .eq('id', playerData.sold_to);
          });
          
        if (updatePurseError) {
          throw updatePurseError;
        }
      }
    }
    
    // If the player is being sold to a new team
    if (updates.sold && updates.sold_to && updates.bid_price) {
      // Check if team has enough purse for this bid
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('purse')
        .eq('id', updates.sold_to)
        .single();
        
      if (teamError) {
        throw teamError;
      }
      
      if (teamData.purse < updates.bid_price) {
        return { 
          success: false, 
          error: new Error(`Team doesn't have enough purse (${teamData.purse} Cr) for this bid (${updates.bid_price} Cr)`) 
        };
      }
      
      // Add team_player association
      const { error: addAssocError } = await supabase
        .from('team_players')
        .insert([{
          team_id: updates.sold_to,
          player_id: playerId,
          bid_price: updates.bid_price
        }]);
        
      if (addAssocError) {
        throw addAssocError;
      }
      
      // Update the new team's purse and points
      const { error: updatePurseError } = await supabase
        .from('teams')
        .select('purse, points')
        .eq('id', updates.sold_to)
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return supabase
            .from('teams')
            .update({ 
              purse: data.purse - updates.bid_price,
              points: data.points + playerData.points 
            })
            .eq('id', updates.sold_to);
        });
        
      if (updatePurseError) {
        throw updatePurseError;
      }
    }
    
    // Update the player record
    const { error: updatePlayerError } = await supabase
      .from('players')
      .update(updates)
      .eq('id', playerId);
      
    if (updatePlayerError) {
      throw updatePlayerError;
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error modifying player bid:', error);
    return { success: false, error };
  }
};

// Get team with players
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
    
    // Fetch players associated with the team
    const { data: teamPlayersData, error: playersError } = await supabase
      .from('team_players')
      .select(`
        player_id,
        bid_price,
        players:player_id (*)
      `)
      .eq('team_id', teamId);
      
    if (playersError) {
      throw playersError;
    }
    
    // Transform the data to match the Player type
    const players = teamPlayersData.map(tp => ({
      ...tp.players,
      bid_price: tp.bid_price,
      id: tp.players.id,
      name: tp.players.name,
      category: tp.players.category,
      points: tp.players.points,
      priority: tp.players.priority,
      base_price: tp.players.base_price,
      sold: tp.players.sold,
      sold_to: tp.players.sold_to,
      image_url: tp.players.image_url
    })) as Player[];
    
    return {
      team: teamData,
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

// New function to fetch all public auction data
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
    
    // Get team players for each team
    const teamsWithPlayers = await Promise.all(
      (teamsData || []).map(async (team) => {
        const { data: teamPlayers, error: teamPlayersError } = await supabase
          .from('team_players')
          .select(`
            player_id,
            bid_price,
            players:player_id (*)
          `)
          .eq('team_id', team.id);
          
        if (teamPlayersError) {
          console.error('Error fetching team players:', teamPlayersError);
          return { ...team, players: [] };
        }
        
        // Transform data for players
        const players = (teamPlayers || []).map(tp => ({
          ...tp.players,
          bid_price: tp.bid_price
        }));
        
        return { ...team, players };
      })
    );
    
    // Calculate category counts
    const categoryCounts: Record<string, number> = {
      'Bowler': 0,
      'Batter': 0,
      'All-Rounder': 0
    };
    
    const unsoldPlayers = (playersData || []).filter(player => !player.sold);
    
    unsoldPlayers.forEach((player) => {
      if (player.category && categoryCounts[player.category] !== undefined) {
        categoryCounts[player.category]++;
      }
    });
    
    return {
      players: playersData || [],
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

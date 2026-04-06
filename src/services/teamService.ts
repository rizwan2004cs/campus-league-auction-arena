import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/components/TeamCard';
import { Player } from '@/components/PlayerCard';
import type { Database } from '@/integrations/supabase/types';

type DbPlayer = Database['public']['Tables']['players']['Row'];
type DbTeam = Database['public']['Tables']['teams']['Row'];

// Helper function to transform database player to component player
const transformDbPlayerToPlayer = (dbPlayer: DbPlayer, teamName?: string, bidPrice?: number): Player => {
  return {
    id: dbPlayer.id,
    name: dbPlayer.name,
    category: dbPlayer.category as 'Bowler' | 'Batter' | 'All-Rounder',
    points: dbPlayer.points,
    priority: dbPlayer.priority,
    base_price: dbPlayer.base_price,
    sold: dbPlayer.sold || !!dbPlayer.team_id,
    sold_to: teamName || undefined,
    bid_price: bidPrice || dbPlayer.sold_price || undefined,
    image_url: (dbPlayer as any).image_url || undefined
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
    
    // Fetch players that belong to any team
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .not('team_id', 'is', null);
      
    // Fetch team_players for bid prices
    const { data: tpData } = await supabase
      .from('team_players')
      .select('*');
      
    const teams = (teamsData || []).map(dbTeam => {
      const dbPlayersForTeam = (playersData || []).filter(p => p.team_id === dbTeam.id);
      const fullyParsedPlayers = dbPlayersForTeam.map(dbP => {
         const matchingTp = (tpData || []).find(tp => tp.player_id === dbP.id);
         return transformDbPlayerToPlayer(dbP, dbTeam.name, matchingTp?.bid_price || dbP.sold_price || undefined);
      });
      return transformDbTeamToTeam(dbTeam, fullyParsedPlayers);
    });
    
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
        sold_price: null,
        sold: false,
        sold_to: null
      })
      .not('team_id', 'is', null);

    // Clear all team_players relationships
    const { error: clearTeamPlayersError } = await supabase
      .from('team_players')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');
      
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
        sold_price: null,
        sold: false,
        sold_to: null
      })
      .eq('team_id', teamId);

    // Remove from team_players table
    const { error: removeTeamPlayersError } = await supabase
      .from('team_players')
      .delete()
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

export const deletePlayer = async (playerId: string): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Get current player data to check if they're sold to a team
    const { data: playerData, error: fetchError } = await supabase
      .from('players')
      .select('*, team_players!inner(bid_price, team_id)')
      .eq('id', playerId)
      .maybeSingle();
      
    if (fetchError) {
      console.error('❌ Error fetching player:', fetchError);
      throw fetchError;
    }

    // If player is sold to a team, restore the team's purse
    if (playerData && playerData.team_players && playerData.team_players.length > 0) {
      const teamPlayerData = playerData.team_players[0];
      const teamId = teamPlayerData.team_id;
      const bidPrice = teamPlayerData.bid_price || 0;

      // Get current team data
      const { data: teamData, error: getTeamError } = await supabase
        .from('teams')
        .select('purse, points')
        .eq('id', teamId)
        .single();
        
      if (getTeamError) {
        throw getTeamError;
      }

      // Calculate new purse (restore bid price) and points (subtract player points)
      const newPurse = teamData.purse + bidPrice;
      const newPoints = Math.max(0, teamData.points - (playerData.points || 0));

      // Update team purse and points
      const { error: updateTeamError } = await supabase
        .from('teams')
        .update({ 
          purse: newPurse,
          points: newPoints
        })
        .eq('id', teamId);
        
      if (updateTeamError) {
        throw updateTeamError;
      }

      // Remove from team_players table
      const { error: removeTeamPlayerError } = await supabase
        .from('team_players')
        .delete()
        .eq('player_id', playerId);
        
      if (removeTeamPlayerError) {
        throw removeTeamPlayerError;
      }
    }

    // Delete the player
    const { error: deletePlayerError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);
      
    if (deletePlayerError) {
      throw deletePlayerError;
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error deleting player:', error);
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
    console.log('🔧 Starting modifyPlayerBid:', { playerId, updates });
    
    // Get current player data
    const { data: playerData, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
    
    console.log('📊 Current player data:', playerData);
      
    if (fetchError) {
      console.error('❌ Error fetching player:', fetchError);
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
      console.log('💰 Processing new bid for team:', updates.sold_to);
      
      // Get current team data and calculate new values
      const { data: currentTeamData, error: getTeamError } = await supabase
        .from('teams')
        .select('purse, points')
        .eq('id', updates.sold_to)
        .single();
      
      console.log('🏆 Team data before bid:', currentTeamData);
        
      if (getTeamError) {
        console.error('❌ Error fetching team:', getTeamError);
        throw getTeamError;
      }
      
      if (currentTeamData.purse < updates.bid_price) {
        console.error('💸 Insufficient purse:', { purse: currentTeamData.purse, bid: updates.bid_price });
        return { 
          success: false, 
          error: new Error(`Team doesn't have enough purse (${currentTeamData.purse} Cr) for this bid (${updates.bid_price} Cr)`) 
        };
      }
      
      // Update team purse and points
      console.log('🔄 Updating team purse and points...');
      const newPurse = currentTeamData.purse - updates.bid_price;
      const newPoints = currentTeamData.points + playerData.points;
      
      const { error: updateTeamError } = await supabase
        .from('teams')
        .update({ 
          purse: newPurse,
          points: newPoints
        })
        .eq('id', updates.sold_to);
        
      if (updateTeamError) {
        console.error('❌ Error updating team:', updateTeamError);
        throw updateTeamError;
      }
      
      console.log('✅ Team updated successfully:', { newPurse, newPoints });
      
      // Update player
      console.log('🔄 Updating player...');
      const { error: updatePlayerError } = await supabase
        .from('players')
        .update({
          team_id: updates.sold_to,
          sold_price: updates.bid_price,
          sold: true,
          sold_to: updates.sold_to
        })
        .eq('id', playerId);
        
      if (updatePlayerError) {
        console.error('❌ Error updating player:', updatePlayerError);
        throw updatePlayerError;
      }
      
      console.log('✅ Player updated successfully');

      // Add to team_players table
      console.log('🔄 Adding to team_players...');
      
      // Clean up any existing records for this player first to prevent duplicates
      await supabase.from('team_players').delete().eq('player_id', playerId);
      
      const { error: addTeamPlayerError } = await supabase
        .from('team_players')
        .insert({
          team_id: updates.sold_to,
          player_id: playerId,
          bid_price: updates.bid_price
        });
        
      if (addTeamPlayerError) {
        console.error('❌ Error adding to team_players:', addTeamPlayerError);
        throw addTeamPlayerError;
      }
      
      console.log('✅ Added to team_players successfully');
        
      if (updatePlayerError) {
        throw updatePlayerError;
      }
    } else {
      // Reset player (unsold)
      const { error: updatePlayerError } = await supabase
        .from('players')
        .update({
          team_id: null,
          sold_price: null,
          sold: false,
          sold_to: null
        })
        .eq('id', playerId);

      // Remove from team_players table
      const { error: removeTeamPlayerError } = await supabase
        .from('team_players')
        .delete()
        .eq('player_id', playerId);
        
      if (updatePlayerError) {
        throw updatePlayerError;
      }
    }
    
    console.log('✨ modifyPlayerBid completed successfully');
    return { success: true, error: null };
  } catch (error: any) {
    console.error('💥 Error in modifyPlayerBid:', error);
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
    
    // Fetch team_players relationships to get bid prices
    const { data: teamPlayersData, error: teamPlayersError } = await supabase
      .from('team_players')
      .select('*');
    
    if (teamPlayersError) {
      throw teamPlayersError;
    }
    
    // Create bid price lookup
    const bidPriceMap = new Map(
      (teamPlayersData || []).map(tp => [tp.player_id, tp.bid_price])
    );
    
    // Transform players
    const players = (playersData || []).map(dbPlayer => 
      transformDbPlayerToPlayer(
        dbPlayer, 
        dbPlayer.team_id ? teamNameMap.get(dbPlayer.team_id) : undefined,
        bidPriceMap.get(dbPlayer.id)
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

export const fetchRecentlySoldPlayer = async (): Promise<Player | null> => {
  try {
    const { data: tpData, error: tpError } = await supabase
      .from('team_players')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tpError || !tpData) return null;

    const { data: playerData, error: pError } = await supabase
      .from('players')
      .select('*')
      .eq('id', tpData.player_id)
      .single();

    if (pError || !playerData || !playerData.sold) return null;

    const { data: teamData } = await supabase
      .from('teams')
      .select('name')
      .eq('id', tpData.team_id)
      .single();

    return transformDbPlayerToPlayer(playerData, teamData?.name, tpData.bid_price || playerData.sold_price || undefined);
  } catch (error) {
    console.error('Error fetching recently sold player:', error);
    return null;
  }
};
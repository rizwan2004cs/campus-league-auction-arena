import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PlusCircle } from 'lucide-react';

interface TeamFormProps {
  onTeamAdded: () => void;
  initialPurse: number;
  userId: string | undefined;
}

const TeamForm = ({ onTeamAdded, initialPurse, userId }: TeamFormProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [purse, setPurse] = useState(initialPurse);
  const [submitting, setSubmitting] = useState(false);
  
  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Make sure we have a user ID
      if (!userId) {
        throw new Error('You must be logged in to add a team');
      }
      
      // Check if team name already exists
      const { data: existingTeam, error: checkError } = await supabase
        .from('teams')
        .select('id')
        .ilike('name', name.trim())
        .maybeSingle();
        
      if (checkError) {
        throw checkError;
      }
      
      if (existingTeam) {
        throw new Error(`A team with the name "${name}" already exists`);
      }
      
      // Add team to database with the owner field set to the user's UUID
      // Always set points to 0 for new teams
      const { data, error } = await supabase
        .from('teams')
        .insert([{ 
          name: name.trim(), 
          purse, 
          points: 0,
          owner_id: userId
        }])
        .select();
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Team added',
        description: `${name} has been added successfully`,
      });
      
      // Reset form
      setName('');
      
      // Refresh teams
      onTeamAdded();
    } catch (error: any) {
      toast({
        title: 'Error adding team',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center text-[#1e293b] mb-2">
        <PlusCircle className="h-5 w-5 mr-2 text-[#a78bfa]" />
        <h2 className="font-display font-bold text-lg">Add New Team</h2>
      </div>
      <form onSubmit={handleAddTeam} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold text-[#334155]">Team Name</Label>
          <Input 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="glass-input rounded-xl h-10"
            required 
          />
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor="purse" className="text-xs font-semibold text-[#334155]">Initial Purse (Cr)</Label>
          <Input 
            id="purse" 
            type="number" 
            min={0} 
            step={0.5} 
            value={purse}
            onChange={(e) => setPurse(parseFloat(e.target.value))}
            className="glass-input rounded-xl h-10"
            required 
          />
          <p className="text-[10px] text-[#475569]">
            Default purse for newly added teams
          </p>
        </div>
        
        <Button type="submit" className="w-full primary-button" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Team'
          )}
        </Button>
      </form>
    </div>
  );
};

export default TeamForm;

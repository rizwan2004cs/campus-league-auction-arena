
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/lib/supabase';
import { Loader2, PlusCircle } from 'lucide-react';

interface TeamFormProps {
  onTeamAdded: () => void;
  initialPurse: number;
  userEmail: string | undefined;
}

const TeamForm = ({ onTeamAdded, initialPurse, userEmail }: TeamFormProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [purse, setPurse] = useState(initialPurse);
  const [submitting, setSubmitting] = useState(false);
  
  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Make sure we have a user email
      if (!userEmail) {
        throw new Error('You must be logged in to add a team');
      }
      
      // Add team to database with the owner field set to the user's email
      const { data, error } = await supabase
        .from('teams')
        .insert([{ 
          name, 
          purse, 
          points: 0,
          owner: userEmail
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PlusCircle className="h-5 w-5 mr-2" />
          Add New Team
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddTeam} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="purse">Initial Purse (Cr)</Label>
            <Input 
              id="purse" 
              type="number" 
              min={0} 
              step={0.5} 
              value={purse}
              onChange={(e) => setPurse(parseFloat(e.target.value))}
              required 
            />
            <p className="text-xs text-muted-foreground">
              Default purse for newly added teams
            </p>
          </div>
          
          <Button type="submit" className="w-full" disabled={submitting}>
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
      </CardContent>
    </Card>
  );
};

export default TeamForm;

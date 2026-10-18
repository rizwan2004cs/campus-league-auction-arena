
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Loader2 } from 'lucide-react';
import { updateAllTeamPurses } from '@/services/teamService';

interface PurseUpdaterProps {
  initialValue: number;
  onUpdate: () => void;
}

const PurseUpdater = ({ initialValue, onUpdate }: PurseUpdaterProps) => {
  const { toast } = useToast();
  const [globalPurse, setGlobalPurse] = useState(initialValue);
  const [updatingPurse, setUpdatingPurse] = useState(false);
  
  const handleUpdateAllPurses = async () => {
    try {
      setUpdatingPurse(true);
      
      const { success, error } = await updateAllTeamPurses(globalPurse);
      
      if (error) {
        throw error;
      }
      
      if (success) {
        toast({
          title: 'Purses updated',
          description: `All teams now have ${globalPurse} Cr purse`,
        });
        
        // Refresh teams
        onUpdate();
      }
    } catch (error: any) {
      toast({
        title: 'Error updating purses',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingPurse(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center text-ink mb-2">
        <RefreshCw className="h-5 w-5 mr-2 text-tan" />
        <h2 className="font-display font-bold text-lg">Update All Purses</h2>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="globalPurse" className="text-xs font-semibold text-ink">New Purse Value (Cr)</Label>
          <Input 
            id="globalPurse" 
            type="number" 
            min={0} 
            step={0.5} 
            value={globalPurse}
            onChange={(e) => setGlobalPurse(parseFloat(e.target.value))}
            className="glass-input rounded-xl h-10"
            required 
          />
          <p className="text-[10px] text-soft">
            This will update all teams' purses to this value
          </p>
        </div>
        
        <Button 
          className="w-full secondary-button" 
          disabled={updatingPurse}
          onClick={handleUpdateAllPurses}
        >
          {updatingPurse ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin outline-none" />
              Updating...
            </>
          ) : (
            'Update All Teams'
          )}
        </Button>
      </div>
    </div>
  );
};

export default PurseUpdater;

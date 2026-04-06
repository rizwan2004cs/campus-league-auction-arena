import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Users } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from || '/dashboard';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-6xl flex items-center justify-between gap-16 lg:gap-24">
        
        {/* Left: Login Form */}
        <div className="w-full max-w-md flex-shrink-0">
          <div className="glass-login p-10">
            <div className="space-y-2 mb-8">
              <h2 className="text-3xl font-display font-bold text-[#1e293b]">Welcome back</h2>
              <p className="text-base text-[#475569]">
                Enter your credentials to continue
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[#1e293b] font-semibold text-base">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input rounded-xl h-12 text-base px-4"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" className="text-[#1e293b] font-semibold text-base">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input rounded-xl h-12 text-base px-4"
                  required
                />
              </div>
              
              <div className="pt-2 flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full primary-button h-14 text-lg" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in…
                    </>
                  ) : 'Sign In as Admin'}
                </Button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-[#475569]/20"></div>
                  <span className="flex-shrink-0 mx-4 text-[#475569] text-xs font-semibold uppercase tracking-wider">Or</span>
                  <div className="flex-grow border-t border-[#475569]/20"></div>
                </div>

                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full h-14 text-base font-semibold border-2 border-[#93c5fd]/30 text-[#334155] hover:bg-[#bae6fd]/30 rounded-xl" 
                  onClick={() => navigate('/public')}
                >
                  <Users className="mr-2 h-5 w-5" />
                  Continue as Participant
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Large CPL Logo (SVG file) — hidden on small screens */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <img 
            src="/icons/Campus Premier League.svg" 
            alt="Campus Premier League" 
            className="w-full max-w-2xl drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            style={{ filter: 'drop-shadow(0 12px 40px rgba(220,140,160,0.3))' }}
          />
        </div>

      </div>
    </div>
  );
};

export default Login;

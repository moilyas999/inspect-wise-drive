import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, Building2 } from 'lucide-react';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, userRole, signIn, signUp } = useAuth();
  const { toast } = useToast();

  if (user && userRole) {
    // Redirect based on role
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (userRole === 'staff') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      
      if (isSignUp) {
        // Admin signup with business creation using direct Supabase call
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              role: 'admin',
              business_name: businessName,
              name: name
            }
          }
        });
        result = { data, error };
      } else {
        // Regular login for both admin and staff
        result = await signIn(email, password);
      }

      if (result.error) {
        toast({
          title: "Authentication Error",
          description: result.error.message,
          variant: "destructive",
        });
      } else if (isSignUp) {
        toast({
          title: "Business Account Created!",
          description: "Please check your email to verify your account.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      {/* Mobile-first safe area */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 safe-area-inset">
        <div className="w-full max-w-sm mx-auto space-y-8">
          {/* App-style header */}
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-primary">
              <Building2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">VehicleWise</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">Professional Vehicle Inspection Platform</p>
            </div>
          </div>

          {/* Mobile-optimized card */}
          <Card className="shadow-card border-0 backdrop-blur-sm bg-card/95 rounded-2xl">
            <CardHeader className="space-y-3 pb-6">
              <CardTitle className="text-xl font-semibold text-center leading-tight">
                {isSignUp ? 'Create Business Account' : 'Welcome Back'}
              </CardTitle>
              <CardDescription className="text-center text-sm leading-relaxed px-2">
                {isSignUp 
                  ? 'Register your business and start managing vehicle inspections' 
                  : 'Sign in to access your account'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleSubmit} className="space-y-5">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-sm font-medium">Business Name</Label>
                    <Input
                      id="businessName"
                      type="text"
                      placeholder="Enter your business name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className="h-14 text-base rounded-xl border-2 focus:border-primary/30"
                    />
                  </div>
                )}

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Your Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-14 text-base rounded-xl border-2 focus:border-primary/30"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 text-base rounded-xl border-2 focus:border-primary/30"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 text-base rounded-xl border-2 focus:border-primary/30"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="mobile"
                    className="w-full h-14 text-base font-semibold rounded-xl"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        {isSignUp ? 'Creating Account...' : 'Signing In...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        {isSignUp ? 'Create Account' : 'Sign In'}
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors active:scale-95 py-2 px-4 rounded-lg"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have a business account? Register now"
                  }
                </button>
              </div>

              {!isSignUp && (
                <div className="mt-6 p-4 bg-accent/10 rounded-xl border border-accent/20">
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    <strong className="text-foreground">Staff members:</strong> Your admin will provide login credentials. 
                    Contact your business administrator if you need access.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
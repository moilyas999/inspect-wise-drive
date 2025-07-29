import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, Building2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { MobileScreen } from '@/components/ui/mobile-container';
import { MobileCard, MobileCardContent, MobileCardHeader } from '@/components/ui/mobile-card';
import { MobileInput } from '@/components/ui/mobile-input';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <MobileScreen withPadding={false} className="flex flex-col">
      {/* Status bar background */}
      <div className="h-11 bg-gradient-to-r from-primary via-primary/90 to-primary" />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 min-h-0">
        {/* Hero section */}
        <div className="text-center space-y-8 mb-8">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/25">
              <Building2 className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Status Motor Group
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Collections Management App
            </p>
          </div>
        </div>

        {/* Auth form */}
        <MobileCard variant="elevated" className="max-w-sm mx-auto w-full">
          <MobileCardHeader>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSignUp 
                  ? 'Register your business and start managing' 
                  : 'Sign in to access your account'
                }
              </p>
            </div>
          </MobileCardHeader>
          
          <MobileCardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <MobileInput
                  id="businessName"
                  type="text"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  leftIcon={<Building2 className="w-5 h-5" />}
                />
              )}

              {isSignUp && (
                <MobileInput
                  id="name"
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  leftIcon={<User className="w-5 h-5" />}
                />
              )}
              
              <MobileInput
                id="email"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                leftIcon={<Mail className="w-5 h-5" />}
              />
              
              <MobileInput
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 hover:bg-accent rounded-full transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
              />

              <div className="pt-4">
                <Button
                  type="submit"
                  variant="mobile"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-3" />
                      {isSignUp ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-3" />
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Toggle auth mode */}
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:text-primary/80 font-medium transition-colors py-3 px-6 rounded-2xl hover:bg-accent/30 active:scale-95 transition-all duration-150"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have a business account? Register"
                }
              </button>
            </div>

            {/* Staff notice */}
            {!isSignUp && (
              <div className="mt-6 p-4 bg-accent/20 rounded-2xl border border-accent/30">
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  <span className="font-semibold text-foreground">Staff members:</span> Your admin will provide login credentials
                </p>
              </div>
            )}
          </MobileCardContent>
        </MobileCard>
      </div>
      
      {/* Bottom safe area */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </MobileScreen>
  );
};

export default Auth;
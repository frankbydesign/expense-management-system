import { useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Database } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useLogo } from './LogoContext';

interface LoginFormProps {
  onLoginSuccess: (user: any, accessToken: string) => void;
  onShowSetup?: () => void;
}

export function LoginForm({ onLoginSuccess, onShowSetup }: LoginFormProps) {
  const { logoUrl } = useLogo();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'consultant' | 'manager'>('consultant');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError || !data.session) {
        setError(signInError?.message || 'Login failed');
        setIsLoading(false);
        return;
      }

      // Fetch user info from server
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/session`, {
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
        },
      });

      const sessionData = await response.json();

      if (sessionData.user) {
        onLoginSuccess(sessionData.user, data.session.access_token);
      } else {
        setError('Failed to fetch user information');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Create user via server
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          name: signupName,
          role: signupRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Signup failed');
        setIsLoading(false);
        return;
      }

      // Now log in with the new credentials
      const supabase = createClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: signupEmail,
        password: signupPassword,
      });

      if (signInError || !signInData.session) {
        setError('Account created but login failed. Please try logging in.');
        setIsLoading(false);
        return;
      }

      onLoginSuccess(data.user, signInData.session.access_token);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <ImageWithFallback 
              src={logoUrl}
              alt="True North Logo"
              className="w-20 h-20 object-contain rounded-lg"
            />
          </div>
          <h1 className="text-gray-900">True North Expense Tracker</h1>
          <p className="text-gray-600 mt-2">Upload expenses and manage approvals</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value="consultant"
                          checked={signupRole === 'consultant'}
                          onChange={(e) => setSignupRole('consultant')}
                          disabled={isLoading}
                          className="w-4 h-4"
                        />
                        <span>Consultant</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value="manager"
                          checked={signupRole === 'manager'}
                          onChange={(e) => setSignupRole('manager')}
                          disabled={isLoading}
                          className="w-4 h-4"
                        />
                        <span>Manager</span>
                      </label>
                    </div>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {onShowSetup && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full" 
                  onClick={onShowSetup}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Setup Sample Data
                </Button>
                <p className="text-xs text-center text-gray-500 mt-2">
                  Create test accounts and projects
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
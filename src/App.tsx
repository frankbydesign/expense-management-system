import { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { ConsultantDashboard } from './components/ConsultantDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { SetupSampleData } from './components/SetupSampleData';
import { LogoProvider } from './components/LogoContext';
import { createClient } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
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
        setUser(sessionData.user);
        setAccessToken(data.session.access_token);
      }
    } catch (err) {
      console.error('Error checking session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (userData: any, token: string) => {
    setUser(userData);
    setAccessToken(token);
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken(null);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <LogoProvider>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      ) : showSetup ? (
        <SetupSampleData onBack={() => setShowSetup(false)} />
      ) : !user || !accessToken ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} onShowSetup={() => setShowSetup(true)} />
      ) : user.role === 'consultant' ? (
        <ConsultantDashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
      ) : user.role === 'manager' ? (
        <ManagerDashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-red-600">Invalid user role</p>
        </div>
      )}
    </LogoProvider>
  );
}
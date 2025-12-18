import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LogoContextType {
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  isLoading: boolean;
  refreshLogo: () => Promise<void>;
}

const defaultLogoUrl = 'https://images.unsplash.com/photo-1745970649913-2edb9dca4f74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wYXNzJTIwbm9ydGglMjBsb2dvfGVufDF8fHx8MTc2MDU4MzI1MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export function LogoProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogoUrl);
  const [isLoading, setIsLoading] = useState(true);

  const refreshLogo = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/logo`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching logo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshLogo();
  }, []);

  return (
    <LogoContext.Provider value={{ logoUrl, setLogoUrl, isLoading, refreshLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo() {
  const context = useContext(LogoContext);
  if (context === undefined) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
}

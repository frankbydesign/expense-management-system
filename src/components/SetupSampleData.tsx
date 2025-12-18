import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Credentials {
  manager: {
    email: string;
    password: string;
    name: string;
  };
  consultants: {
    email: string;
    password: string;
    name: string;
  }[];
}

interface SetupSampleDataProps {
  onBack?: () => void;
}

export function SetupSampleData({ onBack }: SetupSampleDataProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    setIsLoading(true);
    setError(null);
    setCredentials(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/setup-sample-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup sample data');
      }

      setCredentials(data.credentials);
    } catch (err: any) {
      console.error('Error setting up sample data:', err);
      setError(err.message || 'An error occurred while setting up sample data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="w-fit mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          )}
          <CardTitle>Setup Sample Data</CardTitle>
          <CardDescription>
            Click the button below to populate the database with sample users and projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={handleSetup} 
            disabled={isLoading || !!credentials}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up sample data...
              </>
            ) : credentials ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Sample data created successfully
              </>
            ) : (
              'Create Sample Data'
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {credentials && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-800">
                    Sample data has been created successfully! Use the credentials below to log in.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-blue-900 mb-3">Manager Account</h3>
                  <div className="space-y-1 font-mono text-sm">
                    <p><span className="text-blue-700">Name:</span> {credentials.manager.name}</p>
                    <p><span className="text-blue-700">Email:</span> {credentials.manager.email}</p>
                    <p><span className="text-blue-700">Password:</span> {credentials.manager.password}</p>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="text-purple-900 mb-3">Consultant Accounts</h3>
                  <div className="space-y-3">
                    {credentials.consultants.map((consultant, index) => (
                      <div key={index} className="space-y-1 font-mono text-sm pb-3 border-b border-purple-200 last:border-b-0 last:pb-0">
                        <p><span className="text-purple-700">Name:</span> {consultant.name}</p>
                        <p><span className="text-purple-700">Email:</span> {consultant.email}</p>
                        <p><span className="text-purple-700">Password:</span> {consultant.password}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-amber-900 mb-2">Projects Created</h3>
                  <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                    <li>Digital Transformation Initiative (both consultants assigned)</li>
                    <li>Cloud Migration Project (John Smith assigned)</li>
                  </ul>
                </div>
              </div>

              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="w-full"
              >
                Go to Login
              </Button>

              {onBack && (
                <Button 
                  onClick={onBack} 
                  className="w-full"
                >
                  Back to Login
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
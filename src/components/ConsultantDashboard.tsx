import { useState, useEffect, useRef } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LogOut, Upload, Navigation, Receipt, DollarSign, CheckCircle, XCircle, Clock, UserCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { useLogo } from './LogoContext';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ProfileSettings } from './ProfileSettings';
import { createClient } from '../utils/supabase/client';

interface ConsultantDashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

export function ConsultantDashboard({ user, accessToken, onLogout }: ConsultantDashboardProps) {
  const { logoUrl } = useLogo();
  const [currentUser, setCurrentUser] = useState(user);
  const [projects, setProjects] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Expense form
  const [expenseProjectId, setExpenseProjectId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseReceipt, setExpenseReceipt] = useState<File | null>(null);

  // Mileage fields (optional, part of expense)
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [distance, setDistance] = useState('');
  const [includeMileage, setIncludeMileage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const refreshUserProfile = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/session`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch projects
      const projectsRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/projects`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const projectsData = await projectsRes.json();
      setProjects(projectsData.projects || []);

      // Fetch expenses
      const expensesRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/expenses`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const expensesData = await expensesRes.json();
      setExpenses(expensesData.expenses || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseReceipt) {
      toast.error('Please attach a receipt');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('projectId', expenseProjectId);
      formData.append('amount', expenseAmount);
      formData.append('description', expenseDescription);
      formData.append('date', expenseDate);
      formData.append('receipt', expenseReceipt);
      
      // Add mileage data if included
      if (includeMileage && startLocation && endLocation && distance) {
        formData.append('startLocation', startLocation);
        formData.append('endLocation', endLocation);
        formData.append('distance', distance);
      }

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/expenses`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to submit expense');
        setIsLoading(false);
        setUploadProgress(0);
        return;
      }

      toast.success('Expense submitted successfully and is pending approval');
      
      // Reset form
      setExpenseProjectId('');
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseReceipt(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setStartLocation('');
      setEndLocation('');
      setDistance('');
      setIncludeMileage(false);
      setUploadProgress(0);
      
      // Refresh data to show new expense
      await fetchData();
    } catch (err) {
      console.error('Error submitting expense:', err);
      toast.error('Failed to submit expense');
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ImageWithFallback 
              src={logoUrl}
              alt="True North Logo"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-gray-900">True North Expense Tracker</h1>
              <p className="text-gray-600 mt-1">Welcome, {currentUser.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentUser.avatarUrl || ''} alt={currentUser.name || 'User'} />
              <AvatarFallback>
                {currentUser.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {projects.length === 0 && (
          <Alert className="mb-6">
            <AlertDescription>
              You haven't been assigned to any projects yet. Contact your manager to get started.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="expenses">
              <Receipt className="w-4 h-4 mr-2" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="projects">
              <DollarSign className="w-4 h-4 mr-2" />
              My Projects
            </TabsTrigger>
            <TabsTrigger value="profile">
              <UserCircle className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Expense</CardTitle>
                <CardDescription>Upload a receipt and expense details (mileage optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense-project">Project</Label>
                    <Select value={expenseProjectId} onValueChange={setExpenseProjectId} required disabled={projects.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((proj) => (
                          <SelectItem key={proj.id} value={proj.id}>
                            {proj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expense-amount">Amount ($)</Label>
                      <Input
                        id="expense-amount"
                        type="number"
                        step="0.01"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expense-date">Date</Label>
                      <Input
                        id="expense-date"
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-description">Description</Label>
                    <Textarea
                      id="expense-description"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      placeholder="e.g., Client dinner, Travel costs..."
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-receipt">Receipt</Label>
                    <Input
                      ref={fileInputRef}
                      id="expense-receipt"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setExpenseReceipt(e.target.files?.[0] || null)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="include-mileage"
                        checked={includeMileage}
                        onChange={(e) => setIncludeMileage(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <Label htmlFor="include-mileage" className="cursor-pointer">
                        Include Mileage Reimbursement
                      </Label>
                    </div>
                    
                    {includeMileage && (
                      <div className="space-y-4 pl-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="start-location">Start Location</Label>
                            <Input
                              id="start-location"
                              value={startLocation}
                              onChange={(e) => setStartLocation(e.target.value)}
                              placeholder="e.g., Home"
                              required={includeMileage}
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="end-location">End Location</Label>
                            <Input
                              id="end-location"
                              value={endLocation}
                              onChange={(e) => setEndLocation(e.target.value)}
                              placeholder="e.g., Airport, Office"
                              required={includeMileage}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="distance">Distance (miles)</Label>
                          <Input
                            id="distance"
                            type="number"
                            step="0.1"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            required={includeMileage}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {isLoading && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Uploading receipt...</span>
                        <span className="text-gray-900">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}
                  
                  <Button type="submit" disabled={isLoading || projects.length === 0}>
                    <Upload className="w-4 h-4 mr-2" />
                    {isLoading ? 'Uploading...' : 'Submit Expense'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Expenses</CardTitle>
                <CardDescription>View all your submitted expenses and their approval status</CardDescription>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No expenses submitted yet</p>
                ) : (
                  <div className="space-y-4">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-gray-900">{expense.description}</p>
                            <p className="text-gray-600 mt-1">
                              ${expense.amount.toFixed(2)} • {new Date(expense.date).toLocaleDateString()}
                            </p>
                            {expense.submittedBy && expense.submittedBy !== expense.consultantEmail && (
                              <p className="text-gray-600 mt-1 text-sm italic">
                                Created by manager: {expense.submittedBy}
                              </p>
                            )}
                            {expense.mileage && (
                              <p className="text-gray-600 mt-1 flex items-center">
                                <Navigation className="w-4 h-4 mr-1" />
                                {expense.mileage.startLocation} → {expense.mileage.endLocation} ({expense.mileage.distance} miles)
                              </p>
                            )}
                          </div>
                          {getStatusBadge(expense.status)}
                        </div>
                        {expense.receiptUrl && (
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center mt-2"
                          >
                            <Receipt className="w-4 h-4 mr-1" />
                            View Receipt
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Projects</CardTitle>
                <CardDescription>Projects you're currently working on</CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No projects assigned yet</p>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div key={project.id} className="border rounded-lg p-4">
                        <h3 className="text-gray-900">{project.name}</h3>
                        {project.description && (
                          <p className="text-gray-600 mt-1">{project.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings 
              user={currentUser} 
              accessToken={accessToken} 
              onProfileUpdate={refreshUserProfile}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
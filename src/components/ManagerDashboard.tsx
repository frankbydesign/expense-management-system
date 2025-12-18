import { useState, useEffect, useRef } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LogOut, Plus, Users, Receipt, Navigation, CheckCircle, XCircle, Clock, FolderKanban, Trash2, Settings, Upload, Image, UserCircle, User, Archive, ArchiveRestore, KeyRound, UserPlus, Pencil, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useLogo } from './LogoContext';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ProfileSettings } from './ProfileSettings';
import { createClient } from '../utils/supabase/client';

interface ManagerDashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

export function ManagerDashboard({ user, accessToken, onLogout }: ManagerDashboardProps) {
  const { logoUrl, refreshLogo } = useLogo();
  const [currentUser, setCurrentUser] = useState(user);
  const [projects, setProjects] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Project creation
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // Assignment
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedConsultant, setSelectedConsultant] = useState('');
  
  // Project deletion
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Project filter
  const [projectFilter, setProjectFilter] = useState<'active' | 'archived'>('active');

  // Consultant management
  const [showCreateConsultant, setShowCreateConsultant] = useState(false);
  const [newConsultantEmail, setNewConsultantEmail] = useState('');
  const [newConsultantName, setNewConsultantName] = useState('');
  const [newConsultantPassword, setNewConsultantPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [selectedConsultantForReset, setSelectedConsultantForReset] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showEditConsultant, setShowEditConsultant] = useState(false);
  const [selectedConsultantForEdit, setSelectedConsultantForEdit] = useState<any>(null);
  const [editConsultantName, setEditConsultantName] = useState('');
  const [editConsultantEmail, setEditConsultantEmail] = useState('');

  // Manager expense creation
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [expenseProjectId, setExpenseProjectId] = useState('');
  const [expenseConsultantEmail, setExpenseConsultantEmail] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseReceipt, setExpenseReceipt] = useState<File | null>(null);
  const [includeExpenseMileage, setIncludeExpenseMileage] = useState(false);
  const [expenseStartLocation, setExpenseStartLocation] = useState('');
  const [expenseEndLocation, setExpenseEndLocation] = useState('');
  const [expenseDistance, setExpenseDistance] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const expenseFileInputRef = useRef<HTMLInputElement>(null);

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

      // Fetch consultants
      const consultantsRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/consultants`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const consultantsData = await consultantsRes.json();
      setConsultants(consultantsData.consultants || []);

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to create project');
        setIsLoading(false);
        return;
      }

      toast.success('Project created successfully');
      setShowCreateProject(false);
      setNewProjectName('');
      setNewProjectDescription('');
      fetchData();
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignConsultant = async () => {
    if (!selectedProject || !selectedConsultant) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/projects/${selectedProject.id}/assign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            consultantEmail: selectedConsultant,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to assign consultant');
        setIsLoading(false);
        return;
      }

      toast.success('Consultant assigned successfully');
      setShowAssignDialog(false);
      setSelectedProject(null);
      setSelectedConsultant('');
      fetchData();
    } catch (err) {
      console.error('Error assigning consultant:', err);
      toast.error('Failed to assign consultant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProjectStatus = async (project: any, newStatus: 'active' | 'archived') => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/projects/${project.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to update project status');
        setIsLoading(false);
        return;
      }

      toast.success(`Project ${newStatus === 'archived' ? 'archived' : 'reactivated'} successfully`);
      fetchData();
    } catch (err) {
      console.error('Error updating project status:', err);
      toast.error('Failed to update project status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/projects/${projectToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to delete project');
        setIsLoading(false);
        return;
      }

      toast.success('Project deleted successfully');
      setShowDeleteDialog(false);
      setProjectToDelete(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateExpense = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/expenses/${expenseId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to update expense');
        return;
      }

      toast.success(`Expense ${status}`);
      fetchData();
    } catch (err) {
      console.error('Error updating expense:', err);
      toast.error('Failed to update expense');
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/consultants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: newConsultantEmail,
            name: newConsultantName,
            password: newConsultantPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to create consultant');
        setIsLoading(false);
        return;
      }

      toast.success('Consultant created successfully');
      setShowCreateConsultant(false);
      setNewConsultantEmail('');
      setNewConsultantName('');
      setNewConsultantPassword('');
      fetchData();
    } catch (err) {
      console.error('Error creating consultant:', err);
      toast.error('Failed to create consultant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultantForEdit) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/consultants/${encodeURIComponent(selectedConsultantForEdit.email)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: editConsultantName,
            newEmail: editConsultantEmail !== selectedConsultantForEdit.email ? editConsultantEmail : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to update consultant');
        setIsLoading(false);
        return;
      }

      toast.success('Consultant updated successfully');
      setShowEditConsultant(false);
      setSelectedConsultantForEdit(null);
      setEditConsultantName('');
      setEditConsultantEmail('');
      fetchData();
    } catch (err) {
      console.error('Error updating consultant:', err);
      toast.error('Failed to update consultant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConsultantPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultantForReset) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/consultants/${encodeURIComponent(selectedConsultantForReset.email)}/password`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            password: resetPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to reset password');
        setIsLoading(false);
        return;
      }

      toast.success('Password reset successfully');
      setShowResetPassword(false);
      setSelectedConsultantForReset(null);
      setResetPassword('');
    } catch (err) {
      console.error('Error resetting password:', err);
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
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
      formData.append('consultantEmail', expenseConsultantEmail);
      formData.append('amount', expenseAmount);
      formData.append('description', expenseDescription);
      formData.append('date', expenseDate);
      formData.append('receipt', expenseReceipt);

      // Add mileage data if included
      if (includeExpenseMileage && expenseStartLocation && expenseEndLocation && expenseDistance) {
        formData.append('startLocation', expenseStartLocation);
        formData.append('endLocation', expenseEndLocation);
        formData.append('distance', expenseDistance);
      }

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/expenses`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to create expense');
        setIsLoading(false);
        setUploadProgress(0);
        return;
      }

      toast.success('Expense created successfully and assigned to consultant');
      
      // Reset form and close dialog
      setExpenseProjectId('');
      setExpenseConsultantEmail('');
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseReceipt(null);
      if (expenseFileInputRef.current) {
        expenseFileInputRef.current.value = '';
      }
      setIncludeExpenseMileage(false);
      setExpenseStartLocation('');
      setExpenseEndLocation('');
      setExpenseDistance('');
      setUploadProgress(0);
      setShowCreateExpense(false);
      setIsLoading(false);
      
      // Refresh data to show new expense (do this after closing to avoid blocking)
      fetchData().catch(err => console.error('Error refreshing data:', err));
    } catch (err) {
      console.error('Error creating expense:', err);
      toast.error('Failed to create expense');
      setUploadProgress(0);
      setIsLoading(false);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      toast.error('Please select a logo file');
      return;
    }

    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-178c0a2e/logo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to upload logo');
        setIsUploadingLogo(false);
        return;
      }

      toast.success('Logo updated successfully');
      setLogoFile(null);
      setLogoPreview(null);
      await refreshLogo();
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
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

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getConsultantProjects = (consultantEmail: string) => {
    // Only show active projects for consultants (default to active if no status)
    return projects.filter(p => p.consultantIds?.includes(consultantEmail) && (p.status || 'active') === 'active');
  };

  const getConsultantExpensesCount = (consultantEmail: string) => {
    return expenses.filter(e => e.consultantEmail === consultantEmail).length;
  };

  const getProjectConsultants = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.consultantIds) return [];
    return consultants.filter(c => project.consultantIds.includes(c.email));
  };

  const getConsultantPendingExpenses = (consultantEmail: string) => {
    return expenses.filter(e => e.consultantEmail === consultantEmail && e.status === 'pending').length;
  };

  const pendingExpenses = expenses.filter(e => e.status === 'pending');

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-600">Pending Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-900">{pendingExpenses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-600">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-900">{projects.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="expenses">
              <Receipt className="w-4 h-4 mr-2" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="projects">
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="consultants">
              <Users className="w-4 h-4 mr-2" />
              Consultants
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="profile">
              <UserCircle className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Expense Approvals</CardTitle>
                    <CardDescription>Review and approve all expenses for your managed projects</CardDescription>
                  </div>
                  <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
                    <DialogTrigger asChild>
                      <Button>
                        <FileText className="w-4 h-4 mr-2" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create Expense for Consultant</DialogTitle>
                        <DialogDescription>Enter expense details and assign to a consultant</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateExpense} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="expense-project">Project</Label>
                          <Select value={expenseProjectId} onValueChange={(value) => {
                            setExpenseProjectId(value);
                            setExpenseConsultantEmail(''); // Reset consultant when project changes
                          }}>
                            <SelectTrigger id="expense-project">
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.filter(p => (p.status || 'active') === 'active').map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {expenseProjectId && (
                          <div className="space-y-2">
                            <Label htmlFor="expense-consultant">Assign to Consultant</Label>
                            <Select value={expenseConsultantEmail} onValueChange={setExpenseConsultantEmail} required>
                              <SelectTrigger id="expense-consultant">
                                <SelectValue placeholder="Select a consultant" />
                              </SelectTrigger>
                              <SelectContent>
                                {getProjectConsultants(expenseProjectId).map((consultant) => (
                                  <SelectItem key={consultant.email} value={consultant.email}>
                                    {consultant.name} ({consultant.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {getProjectConsultants(expenseProjectId).length === 0 && (
                              <p className="text-gray-600">No consultants assigned to this project</p>
                            )}
                          </div>
                        )}

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
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="expense-description">Description</Label>
                          <Textarea
                            id="expense-description"
                            value={expenseDescription}
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            required
                            disabled={isLoading}
                            placeholder="Enter expense description..."
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

                        <div className="space-y-2">
                          <Label htmlFor="expense-receipt">Receipt</Label>
                          <Input
                            ref={expenseFileInputRef}
                            id="expense-receipt"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setExpenseReceipt(e.target.files?.[0] || null)}
                            required
                            disabled={isLoading}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="include-expense-mileage"
                              checked={includeExpenseMileage}
                              onChange={(e) => setIncludeExpenseMileage(e.target.checked)}
                              className="w-4 h-4"
                            />
                            <Label htmlFor="include-expense-mileage">Include mileage information</Label>
                          </div>
                        </div>

                        {includeExpenseMileage && (
                          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-gray-900">Mileage Details</h4>
                            <div className="space-y-2">
                              <Label htmlFor="expense-start-location">Start Location</Label>
                              <Input
                                id="expense-start-location"
                                value={expenseStartLocation}
                                onChange={(e) => setExpenseStartLocation(e.target.value)}
                                placeholder="e.g., Home"
                                disabled={isLoading}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="expense-end-location">End Location</Label>
                              <Input
                                id="expense-end-location"
                                value={expenseEndLocation}
                                onChange={(e) => setExpenseEndLocation(e.target.value)}
                                placeholder="e.g., Client Office, Airport"
                                disabled={isLoading}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="expense-distance">Distance (miles)</Label>
                              <Input
                                id="expense-distance"
                                type="number"
                                step="0.1"
                                value={expenseDistance}
                                onChange={(e) => setExpenseDistance(e.target.value)}
                                placeholder="0.0"
                                disabled={isLoading}
                              />
                            </div>
                          </div>
                        )}

                        {isLoading && uploadProgress > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Uploading receipt...</span>
                              <span className="text-gray-900">{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCreateExpense(false);
                              setExpenseProjectId('');
                              setExpenseConsultantEmail('');
                              setExpenseAmount('');
                              setExpenseDescription('');
                              setExpenseDate(new Date().toISOString().split('T')[0]);
                              setExpenseReceipt(null);
                              setIncludeExpenseMileage(false);
                              setExpenseStartLocation('');
                              setExpenseEndLocation('');
                              setExpenseDistance('');
                              setUploadProgress(0);
                            }}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isLoading || !expenseConsultantEmail}>
                            <Upload className="w-4 h-4 mr-2" />
                            {isLoading ? 'Uploading...' : 'Submit Expense'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No expenses to review</p>
                ) : (
                  <div className="space-y-4">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-gray-900">{expense.description}</p>
                            <p className="text-gray-600 mt-1">
                              {expense.consultantEmail} • {getProjectName(expense.projectId)}
                            </p>
                            <p className="text-gray-600">
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
                            className="text-blue-600 hover:underline inline-flex items-center mb-3"
                          >
                            <Receipt className="w-4 h-4 mr-1" />
                            View Receipt
                          </a>
                        )}
                        {expense.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateExpense(expense.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdateExpense(expense.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Projects</CardTitle>
                    <CardDescription>
                      View and manage all projects across the organization. All managers can see all projects.
                    </CardDescription>
                  </div>
                  <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>Add a new project to assign to consultants</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateProject} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="project-name">Project Name</Label>
                          <Input
                            id="project-name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            required
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="project-description">Description (optional)</Label>
                          <Textarea
                            id="project-description"
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowCreateProject(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Project'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Button
                    variant={projectFilter === 'active' ? 'default' : 'outline'}
                    onClick={() => setProjectFilter('active')}
                    className="flex-1"
                  >
                    <FolderKanban className="w-4 h-4 mr-2" />
                    Active Projects ({projects.filter(p => (p.status || 'active') === 'active').length})
                  </Button>
                  <Button
                    variant={projectFilter === 'archived' ? 'default' : 'outline'}
                    onClick={() => setProjectFilter('archived')}
                    className="flex-1"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archived ({projects.filter(p => p.status === 'archived').length})
                  </Button>
                </div>

                {projects.filter(p => (p.status || 'active') === projectFilter).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No {projectFilter} projects
                  </p>
                ) : (
                  <div className="space-y-4">
                    {projects.filter(p => (p.status || 'active') === projectFilter).map((project) => (
                      <div key={project.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-gray-900">{project.name}</h3>
                              {(project.status === 'archived') && (
                                <Badge variant="secondary" className="bg-gray-200">
                                  <Archive className="w-3 h-3 mr-1" />
                                  Archived
                                </Badge>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-gray-600 mt-1">{project.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-gray-600">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>
                                  {project.consultantIds?.length || 0} consultant{project.consultantIds?.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <UserCircle className="w-4 h-4 text-gray-400" />
                                <span>Created by: {project.managerId}</span>
                              </div>
                            </div>
                            {project.consultantIds?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {project.consultantIds.map((email: string) => (
                                  <Badge key={email} variant="secondary">{email}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            {(project.status || 'active') === 'active' && (
                              <Dialog open={showAssignDialog && selectedProject?.id === project.id} onOpenChange={(open) => {
                                setShowAssignDialog(open);
                                if (!open) setSelectedProject(null);
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedProject(project)}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Assign
                                  </Button>
                                </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Assign Consultant</DialogTitle>
                                  <DialogDescription>
                                    Assign a consultant to {project.name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Select Consultant</Label>
                                    <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose a consultant" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {consultants.map((consultant) => (
                                          <SelectItem key={consultant.email} value={consultant.email}>
                                            {consultant.name} ({consultant.email})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setShowAssignDialog(false);
                                        setSelectedProject(null);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleAssignConsultant}
                                      disabled={!selectedConsultant || isLoading}
                                    >
                                      {isLoading ? 'Assigning...' : 'Assign'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                              </Dialog>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateProjectStatus(project, (project.status || 'active') === 'active' ? 'archived' : 'active')}
                              disabled={isLoading}
                            >
                              {(project.status || 'active') === 'active' ? (
                                <>
                                  <Archive className="w-4 h-4 mr-1" />
                                  Archive
                                </>
                              ) : (
                                <>
                                  <ArchiveRestore className="w-4 h-4 mr-1" />
                                  Restore
                                </>
                              )}
                            </Button>
                            
                            <AlertDialog open={showDeleteDialog && projectToDelete?.id === project.id} onOpenChange={(open) => {
                              setShowDeleteDialog(open);
                              if (!open) setProjectToDelete(null);
                            }}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setProjectToDelete(project);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to delete this project?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{project.name}" and all associated data. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel
                                    onClick={() => {
                                      setShowDeleteDialog(false);
                                      setProjectToDelete(null);
                                    }}
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDeleteProject}
                                    disabled={isLoading}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {isLoading ? 'Deleting...' : 'Delete Project'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consultants">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Consultant Management</CardTitle>
                    <CardDescription>View all consultants, their project assignments, and manage allocations</CardDescription>
                  </div>
                  <Dialog open={showCreateConsultant} onOpenChange={setShowCreateConsultant}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Consultant
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Consultant</DialogTitle>
                        <DialogDescription>Create a new consultant account with email and password</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateConsultant} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="consultant-email">Email Address</Label>
                          <Input
                            id="consultant-email"
                            type="email"
                            value={newConsultantEmail}
                            onChange={(e) => setNewConsultantEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            placeholder="consultant@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="consultant-name">Full Name</Label>
                          <Input
                            id="consultant-name"
                            value={newConsultantName}
                            onChange={(e) => setNewConsultantName(e.target.value)}
                            disabled={isLoading}
                            placeholder="John Smith"
                          />
                          <p className="text-gray-600">Optional - defaults to email username if not provided</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="consultant-password">Password</Label>
                          <Input
                            id="consultant-password"
                            type="password"
                            value={newConsultantPassword}
                            onChange={(e) => setNewConsultantPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            placeholder="Min. 6 characters"
                            minLength={6}
                          />
                          <p className="text-gray-600">Minimum 6 characters required</p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => {
                            setShowCreateConsultant(false);
                            setNewConsultantEmail('');
                            setNewConsultantName('');
                            setNewConsultantPassword('');
                          }}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Consultant'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {consultants.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No consultants in the system yet</p>
                ) : (
                  <div className="space-y-4">
                    {consultants.map((consultant) => {
                      const consultantProjects = getConsultantProjects(consultant.email);
                      const totalExpenses = getConsultantExpensesCount(consultant.email);
                      const pendingExpensesCount = getConsultantPendingExpenses(consultant.email);
                      
                      return (
                        <div key={consultant.email} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={consultant.avatarUrl || ''} alt={consultant.name || 'Consultant'} />
                                <AvatarFallback>
                                  {consultant.name ? consultant.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-5 h-5" />}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h3 className="text-gray-900">{consultant.name}</h3>
                                <p className="text-gray-600 mt-1">{consultant.email}</p>
                                
                                <div className="flex flex-wrap gap-3 mt-3">
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <FolderKanban className="w-4 h-4" />
                                    <span>{consultantProjects.length} project{consultantProjects.length !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Receipt className="w-4 h-4" />
                                    <span>{totalExpenses} expense{totalExpenses !== 1 ? 's' : ''}</span>
                                  </div>
                                  {pendingExpensesCount > 0 && (
                                    <Badge variant="secondary">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {pendingExpensesCount} pending approval{pendingExpensesCount !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>

                                {consultantProjects.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-gray-700 mb-2">Assigned Projects:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {consultantProjects.map((project) => (
                                        <Badge key={project.id} variant="outline" className="bg-blue-50">
                                          <FolderKanban className="w-3 h-3 mr-1" />
                                          {project.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Dialog open={showEditConsultant && selectedConsultantForEdit?.email === consultant.email} onOpenChange={(open) => {
                                setShowEditConsultant(open);
                                if (!open) {
                                  setSelectedConsultantForEdit(null);
                                  setEditConsultantName('');
                                  setEditConsultantEmail('');
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedConsultantForEdit(consultant);
                                      setEditConsultantName(consultant.name);
                                      setEditConsultantEmail(consultant.email);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Consultant Details</DialogTitle>
                                    <DialogDescription>
                                      Update the consultant's name and email address
                                    </DialogDescription>
                                  </DialogHeader>
                                  <form onSubmit={handleEditConsultant} className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-consultant-name">Full Name</Label>
                                      <Input
                                        id="edit-consultant-name"
                                        value={editConsultantName}
                                        onChange={(e) => setEditConsultantName(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        placeholder="John Smith"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-consultant-email">Email Address</Label>
                                      <Input
                                        id="edit-consultant-email"
                                        type="email"
                                        value={editConsultantEmail}
                                        onChange={(e) => setEditConsultantEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        placeholder="consultant@example.com"
                                      />
                                      <p className="text-gray-600">Changing email will update all project assignments and expenses</p>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => {
                                          setShowEditConsultant(false);
                                          setSelectedConsultantForEdit(null);
                                          setEditConsultantName('');
                                          setEditConsultantEmail('');
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Updating...' : 'Update Details'}
                                      </Button>
                                    </div>
                                  </form>
                                </DialogContent>
                              </Dialog>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Assign to Project
                                  </Button>
                                </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Assign {consultant.name} to Project</DialogTitle>
                                  <DialogDescription>
                                    Select a project to assign this consultant to
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Available Projects</Label>
                                    {projects.filter(p => (p.status || 'active') === 'active').length === 0 ? (
                                      <p className="text-gray-500">No active projects available. Create a project first.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {projects.filter(p => (p.status || 'active') === 'active').map((project) => {
                                          const isAssigned = project.consultantIds?.includes(consultant.email);
                                          return (
                                            <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                                              <div>
                                                <p className="text-gray-900">{project.name}</p>
                                                {project.description && (
                                                  <p className="text-gray-600 mt-1">{project.description}</p>
                                                )}
                                              </div>
                                              <Button
                                                size="sm"
                                                variant={isAssigned ? "outline" : "default"}
                                                onClick={() => {
                                                  setSelectedProject(project);
                                                  setSelectedConsultant(consultant.email);
                                                  handleAssignConsultant();
                                                }}
                                                disabled={isAssigned || isLoading}
                                              >
                                                {isAssigned ? (
                                                  <>
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Assigned
                                                  </>
                                                ) : (
                                                  <>
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Assign
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                              </Dialog>

                              <Dialog open={showResetPassword && selectedConsultantForReset?.email === consultant.email} onOpenChange={(open) => {
                                setShowResetPassword(open);
                                if (!open) {
                                  setSelectedConsultantForReset(null);
                                  setResetPassword('');
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedConsultantForReset(consultant)}
                                  >
                                    <KeyRound className="w-4 h-4 mr-1" />
                                    Reset Password
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reset Password for {consultant.name}</DialogTitle>
                                    <DialogDescription>
                                      Enter a new password for {consultant.email}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <form onSubmit={handleResetConsultantPassword} className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="reset-password">New Password</Label>
                                      <Input
                                        id="reset-password"
                                        type="password"
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        placeholder="Min. 6 characters"
                                        minLength={6}
                                      />
                                      <p className="text-gray-600">Minimum 6 characters required</p>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => {
                                          setShowResetPassword(false);
                                          setSelectedConsultantForReset(null);
                                          setResetPassword('');
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Resetting...' : 'Reset Password'}
                                      </Button>
                                    </div>
                                  </form>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Application Settings</CardTitle>
                <CardDescription>Customize your True North Expense Tracker application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-gray-900 mb-2">Application Logo</h3>
                    <p className="text-gray-600 mb-4">Upload a custom logo to replace the default True North Expense Tracker logo. The logo will appear on the login screen and throughout the application.</p>
                  </div>

                  <div className="flex items-start gap-6">
                    <div className="space-y-2">
                      <Label>Current Logo</Label>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <ImageWithFallback 
                          src={logoUrl}
                          alt="Current Logo"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                    </div>

                    {logoPreview && (
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <img 
                            src={logoPreview}
                            alt="Logo Preview"
                            className="w-24 h-24 object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo-upload">Upload New Logo</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        disabled={isUploadingLogo}
                        className="max-w-sm"
                      />
                      <Button
                        onClick={handleUploadLogo}
                        disabled={!logoFile || isUploadingLogo}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                    </div>
                    <p className="text-gray-600">Recommended: PNG or JPG, 200x200 pixels or larger</p>
                  </div>
                </div>
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
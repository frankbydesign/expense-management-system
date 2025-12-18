import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase Storage bucket on startup
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const bucketName = 'make-178c0a2e-receipts';
const logoBucketName = 'make-178c0a2e-logos';
const avatarBucketName = 'make-178c0a2e-avatars';

// Create buckets if they don't exist
(async () => {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  
  const receiptBucketExists = buckets?.some(bucket => bucket.name === bucketName);
  if (!receiptBucketExists) {
    await supabaseAdmin.storage.createBucket(bucketName, { public: false });
    console.log(`Created bucket: ${bucketName}`);
  }
  
  const logoBucketExists = buckets?.some(bucket => bucket.name === logoBucketName);
  if (!logoBucketExists) {
    await supabaseAdmin.storage.createBucket(logoBucketName, { public: false });
    console.log(`Created bucket: ${logoBucketName}`);
  }
  
  const avatarBucketExists = buckets?.some(bucket => bucket.name === avatarBucketName);
  if (!avatarBucketExists) {
    await supabaseAdmin.storage.createBucket(avatarBucketName, { public: false });
    console.log(`Created bucket: ${avatarBucketName}`);
  }
})();

// Helper to get authenticated user
async function getAuthenticatedUser(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return { user: null, error: 'No token provided' };
  }
  
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user || error) {
    return { user: null, error: 'Invalid token or user not found' };
  }
  
  return { user, error: null };
}

// Health check endpoint
app.get("/make-server-178c0a2e/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== AUTH ROUTES =====

// Sign up new user
app.post("/make-server-178c0a2e/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    if (!email || !password || !name || !role) {
      return c.json({ error: 'Email, password, name, and role are required' }, 400);
    }
    
    if (!['consultant', 'manager'].includes(role)) {
      return c.json({ error: 'Role must be consultant or manager' }, 400);
    }
    
    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });
    
    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }
    
    // Store user info in KV store
    await kv.set(`user:${email}`, { email, name, role, createdAt: new Date().toISOString() });
    
    return c.json({ success: true, user: { email, name, role } });
  } catch (error) {
    console.log(`Error in signup route: ${error}`);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// Get current session
app.get("/make-server-178c0a2e/session", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    
    if (error || !user) {
      return c.json({ user: null }, 401);
    }
    
    // Get user info from KV store
    const userInfo = await kv.get(`user:${user.email}`);
    
    // Get avatar URL if exists
    let avatarUrl = null;
    if (userInfo?.avatarFileName) {
      const { data: urlData } = await supabaseAdmin.storage
        .from(avatarBucketName)
        .createSignedUrl(userInfo.avatarFileName, 31536000); // 1 year expiry
      avatarUrl = urlData?.signedUrl || null;
    }
    
    return c.json({ 
      user: {
        email: user.email,
        name: user.user_metadata?.name,
        role: user.user_metadata?.role,
        avatarUrl,
        ...userInfo
      }
    });
  } catch (error) {
    console.log(`Error getting session: ${error}`);
    return c.json({ user: null }, 500);
  }
});

// ===== PROJECT ROUTES =====

// Create project (manager only)
app.post("/make-server-178c0a2e/projects", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can create projects' }, 403);
    }
    
    const { name, description } = await c.req.json();
    if (!name) {
      return c.json({ error: 'Project name is required' }, 400);
    }
    
    const projectId = crypto.randomUUID();
    const project = {
      id: projectId,
      name,
      description: description || '',
      managerId: user.email,
      consultantIds: [],
      status: 'active', // Default status is active
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`project:${projectId}`, project);
    
    return c.json({ success: true, project });
  } catch (error) {
    console.log(`Error creating project: ${error}`);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

// List projects
app.get("/make-server-178c0a2e/projects", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    const projects = await kv.getByPrefix('project:');
    
    let filteredProjects = projects;
    if (userInfo?.role === 'consultant') {
      // Consultants only see active projects they're assigned to
      filteredProjects = projects.filter(p => 
        p.consultantIds?.includes(user.email) && p.status === 'active'
      );
    } else if (userInfo?.role === 'manager') {
      // Managers see all projects (all managers can see all projects)
      filteredProjects = projects;
    }
    
    return c.json({ projects: filteredProjects });
  } catch (error) {
    console.log(`Error listing projects: ${error}`);
    return c.json({ error: 'Failed to list projects' }, 500);
  }
});

// Assign consultant to project (manager only)
app.post("/make-server-178c0a2e/projects/:projectId/assign", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can assign consultants' }, 403);
    }
    
    const projectId = c.req.param('projectId');
    const { consultantEmail } = await c.req.json();
    
    if (!consultantEmail) {
      return c.json({ error: 'Consultant email is required' }, 400);
    }
    
    // Check if consultant exists
    const consultant = await kv.get(`user:${consultantEmail}`);
    if (!consultant || consultant.role !== 'consultant') {
      return c.json({ error: 'Consultant not found' }, 404);
    }
    
    const project = await kv.get(`project:${projectId}`);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    if (project.managerId !== user.email) {
      return c.json({ error: 'You can only assign consultants to your own projects' }, 403);
    }
    
    // Add consultant if not already assigned
    if (!project.consultantIds.includes(consultantEmail)) {
      project.consultantIds.push(consultantEmail);
      await kv.set(`project:${projectId}`, project);
    }
    
    return c.json({ success: true, project });
  } catch (error) {
    console.log(`Error assigning consultant: ${error}`);
    return c.json({ error: 'Failed to assign consultant' }, 500);
  }
});

// Update project status (archive/unarchive) - manager only
app.patch("/make-server-178c0a2e/projects/:projectId/status", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can update project status' }, 403);
    }
    
    const projectId = c.req.param('projectId');
    const { status } = await c.req.json();
    
    if (!['active', 'archived'].includes(status)) {
      return c.json({ error: 'Invalid status. Must be "active" or "archived"' }, 400);
    }
    
    const project = await kv.get(`project:${projectId}`);
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    const updatedProject = {
      ...project,
      status,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`project:${projectId}`, updatedProject);
    
    return c.json({ success: true, project: updatedProject });
  } catch (error) {
    console.log(`Error updating project status: ${error}`);
    return c.json({ error: 'Failed to update project status' }, 500);
  }
});

// Delete project (manager only)
app.delete("/make-server-178c0a2e/projects/:projectId", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can delete projects' }, 403);
    }
    
    const projectId = c.req.param('projectId');
    const project = await kv.get(`project:${projectId}`);
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    if (project.managerId !== user.email) {
      return c.json({ error: 'You can only delete your own projects' }, 403);
    }
    
    await kv.del(`project:${projectId}`);
    
    return c.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.log(`Error deleting project: ${error}`);
    return c.json({ error: 'Failed to delete project' }, 500);
  }
});

// ===== EXPENSE ROUTES =====

// Upload receipt and create expense
app.post("/make-server-178c0a2e/expenses", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (!userInfo || (userInfo.role !== 'consultant' && userInfo.role !== 'manager')) {
      return c.json({ error: 'Only consultants and managers can submit expenses' }, 403);
    }
    
    const formData = await c.req.formData();
    const projectId = formData.get('projectId') as string;
    const amount = formData.get('amount') as string;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const file = formData.get('receipt') as File;
    
    // Optional fields for managers to assign expenses
    const assignedConsultantEmail = formData.get('consultantEmail') as string | null;
    
    // Optional mileage fields
    const startLocation = formData.get('startLocation') as string | null;
    const endLocation = formData.get('endLocation') as string | null;
    const distance = formData.get('distance') as string | null;
    
    if (!projectId || !amount || !description || !file) {
      return c.json({ error: 'Project, amount, description, and receipt file are required' }, 400);
    }
    
    // Determine the consultant for this expense
    let consultantEmail = user.email;
    if (userInfo.role === 'manager') {
      // For managers, they must assign to a consultant
      if (!assignedConsultantEmail) {
        return c.json({ error: 'Managers must assign expenses to a consultant' }, 400);
      }
      
      // Verify the consultant exists and is assigned to the project
      const project = await kv.get(`project:${projectId}`);
      if (!project) {
        return c.json({ error: 'Project not found' }, 404);
      }
      
      if (project.managerId !== user.email) {
        return c.json({ error: 'You can only create expenses for projects you manage' }, 403);
      }
      
      if (!project.consultantIds?.includes(assignedConsultantEmail)) {
        return c.json({ error: 'Consultant is not assigned to this project' }, 400);
      }
      
      consultantEmail = assignedConsultantEmail;
    }
    
    // Upload file to Supabase Storage
    const fileName = `${crypto.randomUUID()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
      });
    
    if (uploadError) {
      console.log(`Error uploading receipt: ${uploadError.message}`);
      return c.json({ error: 'Failed to upload receipt' }, 500);
    }
    
    // Get signed URL for the file
    const { data: urlData } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000); // 1 year expiry
    
    const expenseId = crypto.randomUUID();
    const expense: any = {
      id: expenseId,
      consultantEmail: consultantEmail,
      projectId,
      amount: parseFloat(amount),
      description,
      date: date || new Date().toISOString(),
      receiptUrl: urlData?.signedUrl || '',
      receiptFileName: fileName,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      submittedBy: user.email // Track who actually created it
    };
    
    // Add mileage data if provided
    if (startLocation && endLocation && distance) {
      expense.mileage = {
        startLocation,
        endLocation,
        distance: parseFloat(distance)
      };
    }
    
    await kv.set(`expense:${expenseId}`, expense);
    
    return c.json({ success: true, expense });
  } catch (error) {
    console.log(`Error creating expense: ${error}`);
    return c.json({ error: 'Failed to create expense' }, 500);
  }
});

// List expenses
app.get("/make-server-178c0a2e/expenses", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    const expenses = await kv.getByPrefix('expense:');
    
    let filteredExpenses = expenses;
    if (userInfo?.role === 'consultant') {
      // Consultants only see their own expenses
      filteredExpenses = expenses.filter(e => e.consultantEmail === user.email);
    } else if (userInfo?.role === 'manager') {
      // Managers see expenses for projects they manage
      const projects = await kv.getByPrefix('project:');
      const managedProjectIds = projects
        .filter(p => p.managerId === user.email)
        .map(p => p.id);
      
      filteredExpenses = expenses.filter(e => managedProjectIds.includes(e.projectId));
    }
    
    // Sort by submission date, newest first
    filteredExpenses.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    
    return c.json({ expenses: filteredExpenses });
  } catch (error) {
    console.log(`Error listing expenses: ${error}`);
    return c.json({ error: 'Failed to list expenses' }, 500);
  }
});

// Approve/reject expense (manager only)
app.put("/make-server-178c0a2e/expenses/:expenseId", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can approve/reject expenses' }, 403);
    }
    
    const expenseId = c.req.param('expenseId');
    const { status } = await c.req.json();
    
    if (!['approved', 'rejected'].includes(status)) {
      return c.json({ error: 'Status must be approved or rejected' }, 400);
    }
    
    const expense = await kv.get(`expense:${expenseId}`);
    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404);
    }
    
    // Check if manager manages this project
    const project = await kv.get(`project:${expense.projectId}`);
    if (!project || project.managerId !== user.email) {
      return c.json({ error: 'You can only approve expenses for projects you manage' }, 403);
    }
    
    expense.status = status;
    expense.reviewedAt = new Date().toISOString();
    expense.reviewedBy = user.email;
    
    await kv.set(`expense:${expenseId}`, expense);
    
    return c.json({ success: true, expense });
  } catch (error) {
    console.log(`Error updating expense: ${error}`);
    return c.json({ error: 'Failed to update expense' }, 500);
  }
});

// ===== MILEAGE ROUTES =====

// Create mileage entry
app.post("/make-server-178c0a2e/mileage", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'consultant') {
      return c.json({ error: 'Only consultants can submit mileage' }, 403);
    }
    
    const { projectId, startLocation, endLocation, distance, date, notes } = await c.req.json();
    
    if (!projectId || !startLocation || !endLocation || !distance) {
      return c.json({ error: 'Project, start location, end location, and distance are required' }, 400);
    }
    
    const mileageId = crypto.randomUUID();
    const mileage = {
      id: mileageId,
      consultantEmail: user.email,
      projectId,
      startLocation,
      endLocation,
      distance: parseFloat(distance),
      date: date || new Date().toISOString(),
      notes: notes || '',
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    
    await kv.set(`mileage:${mileageId}`, mileage);
    
    return c.json({ success: true, mileage });
  } catch (error) {
    console.log(`Error creating mileage entry: ${error}`);
    return c.json({ error: 'Failed to create mileage entry' }, 500);
  }
});

// List mileage entries
app.get("/make-server-178c0a2e/mileage", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    const mileageEntries = await kv.getByPrefix('mileage:');
    
    let filteredEntries = mileageEntries;
    if (userInfo?.role === 'consultant') {
      // Consultants only see their own mileage
      filteredEntries = mileageEntries.filter(m => m.consultantEmail === user.email);
    } else if (userInfo?.role === 'manager') {
      // Managers see mileage for projects they manage
      const projects = await kv.getByPrefix('project:');
      const managedProjectIds = projects
        .filter(p => p.managerId === user.email)
        .map(p => p.id);
      
      filteredEntries = mileageEntries.filter(m => managedProjectIds.includes(m.projectId));
    }
    
    // Sort by submission date, newest first
    filteredEntries.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    
    return c.json({ mileage: filteredEntries });
  } catch (error) {
    console.log(`Error listing mileage entries: ${error}`);
    return c.json({ error: 'Failed to list mileage entries' }, 500);
  }
});

// Approve/reject mileage (manager only)
app.put("/make-server-178c0a2e/mileage/:mileageId", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can approve/reject mileage' }, 403);
    }
    
    const mileageId = c.req.param('mileageId');
    const { status } = await c.req.json();
    
    if (!['approved', 'rejected'].includes(status)) {
      return c.json({ error: 'Status must be approved or rejected' }, 400);
    }
    
    const mileage = await kv.get(`mileage:${mileageId}`);
    if (!mileage) {
      return c.json({ error: 'Mileage entry not found' }, 404);
    }
    
    // Check if manager manages this project
    const project = await kv.get(`project:${mileage.projectId}`);
    if (!project || project.managerId !== user.email) {
      return c.json({ error: 'You can only approve mileage for projects you manage' }, 403);
    }
    
    mileage.status = status;
    mileage.reviewedAt = new Date().toISOString();
    mileage.reviewedBy = user.email;
    
    await kv.set(`mileage:${mileageId}`, mileage);
    
    return c.json({ success: true, mileage });
  } catch (error) {
    console.log(`Error updating mileage entry: ${error}`);
    return c.json({ error: 'Failed to update mileage entry' }, 500);
  }
});

// ===== USER ROUTES =====

// List consultants (manager only)
app.get("/make-server-178c0a2e/consultants", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can view consultants' }, 403);
    }
    
    const allUsers = await kv.getByPrefix('user:');
    const consultants = allUsers.filter(u => u.role === 'consultant');
    
    // Add avatar URLs to consultants
    const consultantsWithAvatars = await Promise.all(
      consultants.map(async (consultant) => {
        let avatarUrl = null;
        if (consultant.avatarFileName) {
          const { data: urlData } = await supabaseAdmin.storage
            .from(avatarBucketName)
            .createSignedUrl(consultant.avatarFileName, 31536000); // 1 year expiry
          avatarUrl = urlData?.signedUrl || null;
        }
        return { ...consultant, avatarUrl };
      })
    );
    
    return c.json({ consultants: consultantsWithAvatars });
  } catch (error) {
    console.log(`Error listing consultants: ${error}`);
    return c.json({ error: 'Failed to list consultants' }, 500);
  }
});

// Create consultant (manager only)
app.post("/make-server-178c0a2e/consultants", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can create consultants' }, 403);
    }
    
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }
    
    // Check if user already exists
    const existingUser = await kv.get(`user:${email}`);
    if (existingUser) {
      return c.json({ error: 'A user with this email already exists' }, 400);
    }
    
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name: name || email.split('@')[0],
        role: 'consultant' 
      },
      email_confirm: true // Auto-confirm since we don't have email server configured
    });
    
    if (authError) {
      console.log(`Error creating consultant auth: ${authError.message}`);
      return c.json({ error: authError.message }, 400);
    }
    
    // Create user in KV store
    const newConsultant = {
      email,
      name: name || email.split('@')[0],
      role: 'consultant',
      createdAt: new Date().toISOString(),
      createdBy: user.email
    };
    
    await kv.set(`user:${email}`, newConsultant);
    
    return c.json({ success: true, consultant: newConsultant });
  } catch (error) {
    console.log(`Error creating consultant: ${error}`);
    return c.json({ error: 'Failed to create consultant' }, 500);
  }
});

// Update consultant details (manager only)
app.patch("/make-server-178c0a2e/consultants/:email", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can update consultants' }, 403);
    }
    
    const consultantEmail = decodeURIComponent(c.req.param('email'));
    const { name, newEmail } = await c.req.json();
    
    // Check if consultant exists
    const consultant = await kv.get(`user:${consultantEmail}`);
    if (!consultant) {
      return c.json({ error: 'Consultant not found' }, 404);
    }
    
    if (consultant.role !== 'consultant') {
      return c.json({ error: 'Can only update consultants' }, 403);
    }
    
    // If email is changing, check if new email is already in use
    if (newEmail && newEmail !== consultantEmail) {
      const existingUser = await kv.get(`user:${newEmail}`);
      if (existingUser) {
        return c.json({ error: 'Email address already in use' }, 400);
      }
      
      // Get the user ID from Supabase Auth
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.log(`Error listing users: ${listError.message}`);
        return c.json({ error: 'Failed to find user' }, 500);
      }
      
      const authUser = users.find(u => u.email === consultantEmail);
      
      if (!authUser) {
        return c.json({ error: 'User not found in auth system' }, 404);
      }
      
      // Update email in auth system
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { email: newEmail }
      );
      
      if (updateError) {
        console.log(`Error updating email: ${updateError.message}`);
        return c.json({ error: 'Failed to update email' }, 500);
      }
      
      // Update all project assignments
      const projects = await kv.getByPrefix('project:');
      for (const project of projects) {
        if (project.consultantIds?.includes(consultantEmail)) {
          project.consultantIds = project.consultantIds.map((email: string) => 
            email === consultantEmail ? newEmail : email
          );
          await kv.set(`project:${project.id}`, project);
        }
      }
      
      // Update all expenses
      const expenses = await kv.getByPrefix('expense:');
      for (const expense of expenses) {
        if (expense.consultantEmail === consultantEmail) {
          expense.consultantEmail = newEmail;
          await kv.set(`expense:${expense.id}`, expense);
        }
      }
      
      // Update all mileage entries
      const mileageEntries = await kv.getByPrefix('mileage:');
      for (const mileage of mileageEntries) {
        if (mileage.consultantEmail === consultantEmail) {
          mileage.consultantEmail = newEmail;
          await kv.set(`mileage:${mileage.id}`, mileage);
        }
      }
      
      // Delete old KV entry and create new one with new email
      await kv.del(`user:${consultantEmail}`);
      consultant.email = newEmail;
    }
    
    // Update name if provided
    if (name !== undefined) {
      consultant.name = name;
    }
    
    consultant.updatedAt = new Date().toISOString();
    consultant.updatedBy = user.email;
    
    await kv.set(`user:${consultant.email}`, consultant);
    
    return c.json({ success: true, consultant });
  } catch (error) {
    console.log(`Error updating consultant: ${error}`);
    return c.json({ error: 'Failed to update consultant' }, 500);
  }
});

// Reset consultant password (manager only)
app.patch("/make-server-178c0a2e/consultants/:email/password", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can reset passwords' }, 403);
    }
    
    const consultantEmail = decodeURIComponent(c.req.param('email'));
    const { password } = await c.req.json();
    
    if (!password) {
      return c.json({ error: 'Password is required' }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }
    
    // Check if consultant exists
    const consultant = await kv.get(`user:${consultantEmail}`);
    if (!consultant) {
      return c.json({ error: 'Consultant not found' }, 404);
    }
    
    if (consultant.role !== 'consultant') {
      return c.json({ error: 'Can only reset passwords for consultants' }, 403);
    }
    
    // Get the user ID from Supabase Auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.log(`Error listing users: ${listError.message}`);
      return c.json({ error: 'Failed to find user' }, 500);
    }
    
    const authUser = users.find(u => u.email === consultantEmail);
    
    if (!authUser) {
      return c.json({ error: 'User not found in auth system' }, 404);
    }
    
    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password }
    );
    
    if (updateError) {
      console.log(`Error updating password: ${updateError.message}`);
      return c.json({ error: 'Failed to update password' }, 500);
    }
    
    return c.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.log(`Error resetting password: ${error}`);
    return c.json({ error: 'Failed to reset password' }, 500);
  }
});

// Update profile (name and email)
app.put("/make-server-178c0a2e/profile", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { name, email: newEmail } = await c.req.json();
    
    if (!name && !newEmail) {
      return c.json({ error: 'Name or email is required' }, 400);
    }
    
    // Get current user info
    const userInfo = await kv.get(`user:${user.email}`);
    if (!userInfo) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Update name in user metadata if provided
    if (name && name !== userInfo.name) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, name } }
      );
      
      if (updateError) {
        console.log(`Error updating user metadata: ${updateError.message}`);
        return c.json({ error: 'Failed to update name' }, 500);
      }
      
      userInfo.name = name;
    }
    
    // Update email if provided and different
    if (newEmail && newEmail !== user.email) {
      // Check if new email is already taken
      const existingUser = await kv.get(`user:${newEmail}`);
      if (existingUser) {
        return c.json({ error: 'Email already in use' }, 400);
      }
      
      // Update email in Supabase Auth
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email: newEmail }
      );
      
      if (emailError) {
        console.log(`Error updating email: ${emailError.message}`);
        return c.json({ error: 'Failed to update email' }, 500);
      }
      
      // Update KV store - delete old entry and create new one
      await kv.del(`user:${user.email}`);
      userInfo.email = newEmail;
      await kv.set(`user:${newEmail}`, userInfo);
      
      // Update references in projects
      const projects = await kv.getByPrefix('project:');
      for (const project of projects) {
        let updated = false;
        
        if (project.managerId === user.email) {
          project.managerId = newEmail;
          updated = true;
        }
        
        if (project.consultantIds?.includes(user.email)) {
          project.consultantIds = project.consultantIds.map((id: string) => 
            id === user.email ? newEmail : id
          );
          updated = true;
        }
        
        if (updated) {
          await kv.set(`project:${project.id}`, project);
        }
      }
      
      // Update references in expenses
      const expenses = await kv.getByPrefix('expense:');
      for (const expense of expenses) {
        if (expense.consultantEmail === user.email) {
          expense.consultantEmail = newEmail;
          await kv.set(`expense:${expense.id}`, expense);
        }
      }
    } else {
      // Just update the existing entry if email didn't change
      await kv.set(`user:${user.email}`, userInfo);
    }
    
    return c.json({ success: true, user: userInfo });
  } catch (error) {
    console.log(`Error updating profile: ${error}`);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Upload avatar
app.post("/make-server-178c0a2e/profile/avatar", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const formData = await c.req.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return c.json({ error: 'Avatar file is required' }, 400);
    }
    
    // Upload file to Supabase Storage
    const fileName = `avatar-${user.id}-${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    const fileBuffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(avatarBucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });
    
    if (uploadError) {
      console.log(`Error uploading avatar: ${uploadError.message}`);
      return c.json({ error: 'Failed to upload avatar' }, 500);
    }
    
    // Get signed URL for the file (1 year expiry)
    const { data: urlData } = await supabaseAdmin.storage
      .from(avatarBucketName)
      .createSignedUrl(fileName, 31536000);
    
    if (!urlData?.signedUrl) {
      return c.json({ error: 'Failed to generate signed URL for avatar' }, 500);
    }
    
    // Update user info in KV
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo) {
      userInfo.avatarFileName = fileName;
      userInfo.avatarUpdatedAt = new Date().toISOString();
      await kv.set(`user:${user.email}`, userInfo);
    }
    
    return c.json({ success: true, avatarUrl: urlData.signedUrl });
  } catch (error) {
    console.log(`Error uploading avatar: ${error}`);
    return c.json({ error: 'Failed to upload avatar' }, 500);
  }
});

// ===== LOGO ROUTES =====

// Get current logo
app.get("/make-server-178c0a2e/logo", async (c) => {
  try {
    const logo = await kv.get('app:logo');
    return c.json({ logoUrl: logo?.url || null });
  } catch (error) {
    console.log(`Error fetching logo: ${error}`);
    return c.json({ error: 'Failed to fetch logo' }, 500);
  }
});

// Upload/update logo (manager only)
app.post("/make-server-178c0a2e/logo", async (c) => {
  try {
    const { user, error } = await getAuthenticatedUser(c.req.raw);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userInfo = await kv.get(`user:${user.email}`);
    if (userInfo?.role !== 'manager') {
      return c.json({ error: 'Only managers can update the logo' }, 403);
    }
    
    const formData = await c.req.formData();
    const file = formData.get('logo') as File;
    
    if (!file) {
      return c.json({ error: 'Logo file is required' }, 400);
    }
    
    // Upload file to Supabase Storage
    const fileName = `logo-${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    const fileBuffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(logoBucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });
    
    if (uploadError) {
      console.log(`Error uploading logo: ${uploadError.message}`);
      return c.json({ error: 'Failed to upload logo' }, 500);
    }
    
    // Get signed URL for the file (1 year expiry)
    const { data: urlData } = await supabaseAdmin.storage
      .from(logoBucketName)
      .createSignedUrl(fileName, 31536000);
    
    if (!urlData?.signedUrl) {
      return c.json({ error: 'Failed to generate signed URL for logo' }, 500);
    }
    
    // Store logo info in KV
    const logoData = {
      url: urlData.signedUrl,
      fileName: fileName,
      uploadedBy: user.email,
      uploadedAt: new Date().toISOString()
    };
    
    await kv.set('app:logo', logoData);
    
    return c.json({ success: true, logoUrl: urlData.signedUrl });
  } catch (error) {
    console.log(`Error updating logo: ${error}`);
    return c.json({ error: 'Failed to update logo' }, 500);
  }
});

// ===== SETUP/SEED DATA ROUTE =====

// Populate database with sample data
app.post("/make-server-178c0a2e/setup-sample-data", async (c) => {
  try {
    console.log('Starting sample data setup...');
    
    // Create 1 Manager
    const managerEmail = 'manager@example.com';
    const managerPassword = 'manager123';
    
    const { data: managerAuthData, error: managerError } = await supabaseAdmin.auth.admin.createUser({
      email: managerEmail,
      password: managerPassword,
      user_metadata: { 
        name: 'Sarah Johnson',
        role: 'manager' 
      },
      email_confirm: true
    });
    
    if (managerError && !managerError.message.includes('already registered')) {
      console.log(`Error creating manager: ${managerError.message}`);
      return c.json({ error: `Failed to create manager: ${managerError.message}` }, 400);
    }
    
    await kv.set(`user:${managerEmail}`, { 
      email: managerEmail, 
      name: 'Sarah Johnson', 
      role: 'manager', 
      createdAt: new Date().toISOString() 
    });
    console.log('Created manager: Sarah Johnson');
    
    // Create 2 Consultants
    const consultant1Email = 'consultant1@example.com';
    const consultant1Password = 'consultant123';
    
    const { data: consultant1AuthData, error: consultant1Error } = await supabaseAdmin.auth.admin.createUser({
      email: consultant1Email,
      password: consultant1Password,
      user_metadata: { 
        name: 'John Smith',
        role: 'consultant' 
      },
      email_confirm: true
    });
    
    if (consultant1Error && !consultant1Error.message.includes('already registered')) {
      console.log(`Error creating consultant 1: ${consultant1Error.message}`);
      return c.json({ error: `Failed to create consultant 1: ${consultant1Error.message}` }, 400);
    }
    
    await kv.set(`user:${consultant1Email}`, { 
      email: consultant1Email, 
      name: 'John Smith', 
      role: 'consultant', 
      createdAt: new Date().toISOString() 
    });
    console.log('Created consultant: John Smith');
    
    const consultant2Email = 'consultant2@example.com';
    const consultant2Password = 'consultant123';
    
    const { data: consultant2AuthData, error: consultant2Error } = await supabaseAdmin.auth.admin.createUser({
      email: consultant2Email,
      password: consultant2Password,
      user_metadata: { 
        name: 'Emily Davis',
        role: 'consultant' 
      },
      email_confirm: true
    });
    
    if (consultant2Error && !consultant2Error.message.includes('already registered')) {
      console.log(`Error creating consultant 2: ${consultant2Error.message}`);
      return c.json({ error: `Failed to create consultant 2: ${consultant2Error.message}` }, 400);
    }
    
    await kv.set(`user:${consultant2Email}`, { 
      email: consultant2Email, 
      name: 'Emily Davis', 
      role: 'consultant', 
      createdAt: new Date().toISOString() 
    });
    console.log('Created consultant: Emily Davis');
    
    // Create 2 Projects
    const project1Id = crypto.randomUUID();
    const project1 = {
      id: project1Id,
      name: 'Digital Transformation Initiative',
      description: 'Enterprise-wide digital transformation project for a Fortune 500 client',
      managerId: managerEmail,
      consultantIds: [consultant1Email, consultant2Email],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`project:${project1Id}`, project1);
    console.log('Created project: Digital Transformation Initiative');
    
    const project2Id = crypto.randomUUID();
    const project2 = {
      id: project2Id,
      name: 'Cloud Migration Project',
      description: 'Migration of legacy systems to AWS cloud infrastructure',
      managerId: managerEmail,
      consultantIds: [consultant1Email],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`project:${project2Id}`, project2);
    console.log('Created project: Cloud Migration Project');
    
    console.log('Sample data setup complete!');
    
    return c.json({ 
      success: true, 
      message: 'Sample data created successfully',
      credentials: {
        manager: {
          email: managerEmail,
          password: managerPassword,
          name: 'Sarah Johnson'
        },
        consultants: [
          {
            email: consultant1Email,
            password: consultant1Password,
            name: 'John Smith'
          },
          {
            email: consultant2Email,
            password: consultant2Password,
            name: 'Emily Davis'
          }
        ]
      },
      projects: [project1, project2]
    });
  } catch (error) {
    console.log(`Error setting up sample data: ${error}`);
    return c.json({ error: 'Failed to setup sample data' }, 500);
  }
});

Deno.serve(app.fetch);
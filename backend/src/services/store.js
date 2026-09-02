// In-memory / initial state store for the full-stack app
let projects = [
  {
    id: 'proj_1',
    title: 'Client Onboarding Pipeline',
    category: 'Sales Automation',
    status: 'In Progress',
    priority: 'High',
    progress: 78,
    owner: 'Alex Rivera',
    description: 'Automated multi-channel prospect engagement and lead scoring sequence.',
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString()
  },
  {
    id: 'proj_2',
    title: 'WhatsApp Business API Gateway',
    category: 'Integrations',
    status: 'Completed',
    priority: 'Urgent',
    progress: 100,
    owner: 'Sarah Chen',
    description: 'High-throughput Meta Graph API template delivery & webhook synchronization.',
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 'proj_3',
    title: 'Voice AI Pitch Assistant',
    category: 'AI / Voice',
    status: 'Planning',
    priority: 'Medium',
    progress: 32,
    owner: 'Liam Davis',
    description: 'Real-time conversational voice agent powered by multilingual LLM streaming.',
    updatedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString()
  },
  {
    id: 'proj_4',
    title: 'Executive Analytics & Reporting',
    category: 'Analytics',
    status: 'In Progress',
    priority: 'High',
    progress: 64,
    owner: 'Elena Rostova',
    description: 'Automated daily revenue velocity metrics, rep leaderboards, and audit trails.',
    updatedAt: new Date(Date.now() - 1000 * 60 * 480).toISOString()
  }
];

let activities = [
  {
    id: 'act_1',
    type: 'project_created',
    message: 'New project "Voice AI Pitch Assistant" created',
    user: 'Liam Davis',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  },
  {
    id: 'act_2',
    type: 'status_updated',
    message: 'WhatsApp Business API Gateway marked as Completed',
    user: 'Sarah Chen',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 'act_3',
    type: 'sync',
    message: 'Lead scoring sequence calibrated across 1,420 prospect records',
    user: 'System Bot',
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString()
  }
];

export const store = {
  getProjects() {
    return [...projects];
  },
  
  getProjectById(id) {
    return projects.find(p => p.id === id) || null;
  },

  createProject(data) {
    const newProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: data.title || 'Untitled Project',
      category: data.category || 'General',
      status: data.status || 'Planning',
      priority: data.priority || 'Medium',
      progress: Math.min(100, Math.max(0, parseInt(data.progress || 0, 10))),
      owner: data.owner || 'You',
      description: data.description || '',
      updatedAt: new Date().toISOString()
    };
    projects.unshift(newProject);
    
    this.addActivity({
      type: 'project_created',
      message: `Project "${newProject.title}" was launched`,
      user: newProject.owner
    });

    return newProject;
  },

  updateProject(id, updates) {
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    const existing = projects[index];
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString()
    };
    projects[index] = updated;

    this.addActivity({
      type: 'project_updated',
      message: `Project "${updated.title}" updated (${updated.status})`,
      user: updated.owner || 'User'
    });

    return updated;
  },

  deleteProject(id) {
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return false;
    const [deleted] = projects.splice(index, 1);
    
    this.addActivity({
      type: 'project_deleted',
      message: `Project "${deleted.title}" was removed`,
      user: 'User'
    });

    return true;
  },

  getStats() {
    const total = projects.length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const inProgress = projects.filter(p => p.status === 'In Progress').length;
    const planning = projects.filter(p => p.status === 'Planning').length;
    const avgProgress = total > 0 
      ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / total) 
      : 0;

    return {
      totalProjects: total,
      completed,
      inProgress,
      planning,
      avgProgress,
      activeUsers: 8,
      apiUptime: '99.98%',
      systemHealth: 'Healthy'
    };
  },

  getActivities() {
    return [...activities];
  },

  addActivity(data) {
    const newActivity = {
      id: `act_${Date.now()}`,
      type: data.type || 'info',
      message: data.message,
      user: data.user || 'System',
      timestamp: new Date().toISOString()
    };
    activities.unshift(newActivity);
    if (activities.length > 50) activities.pop();
    return newActivity;
  }
};

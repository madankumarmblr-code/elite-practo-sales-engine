import { Router } from 'express';
import { store } from '../services/store.js';

export const apiRouter = Router();

// GET /api/stats
apiRouter.get('/stats', (req, res) => {
  try {
    const stats = store.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/projects
apiRouter.get('/projects', (req, res) => {
  try {
    const { status, category, search } = req.query;
    let projects = store.getProjects();

    if (status && status !== 'all') {
      projects = projects.filter(p => p.status.toLowerCase() === status.toLowerCase());
    }
    if (category && category !== 'all') {
      projects = projects.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      projects = projects.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/projects
apiRouter.post('/projects', (req, res) => {
  try {
    const { title, category, priority, status, progress, owner, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Project title is required' });
    }

    const project = store.createProject({
      title: title.trim(),
      category: category || 'General',
      priority: priority || 'Medium',
      status: status || 'Planning',
      progress: progress || 0,
      owner: owner || 'You',
      description: description || ''
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/projects/:id
apiRouter.put('/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = store.updateProject(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/projects/:id
apiRouter.delete('/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = store.deleteProject(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, message: 'Project removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/activities
apiRouter.get('/activities', (req, res) => {
  try {
    const activities = store.getActivities();
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsGrid } from './components/StatsGrid';
import { ProjectCard } from './components/ProjectCard';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ActivityFeed } from './components/ActivityFeed';
import { api } from './api/client';
import { Search, FolderPlus, Layers } from 'lucide-react';
import './styles/index.css';

export function App() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const [healthData, statsData, projectsData, activitiesData] = await Promise.allSettled([
        api.getHealth(),
        api.getStats(),
        api.getProjects({ status: activeTab, search: searchQuery }),
        api.getActivities()
      ]);

      if (healthData.status === 'fulfilled') setHealth(healthData.value);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (projectsData.status === 'fulfilled') setProjects(projectsData.value);
      if (activitiesData.status === 'fulfilled') setActivities(activitiesData.value);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCreateProject = async (formData) => {
    try {
      const newProj = await api.createProject(formData);
      setProjects((prev) => [newProj, ...prev]);
      // Refresh stats & activities
      loadData();
    } catch (err) {
      alert(`Failed to create project: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (id, updates) => {
    try {
      const updated = await api.updateProject(id, updates);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to remove this project?')) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      loadData();
    } catch (err) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      <Header
        health={health}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
        onOpenCreate={() => setIsCreateModalOpen(true)}
      />

      <main className="main-wrapper">
        <div className="hero-header">
          <div className="hero-title-group">
            <h2>Project Command Center</h2>
            <p>Full-stack workspace orchestrating automation pipelines, integrations, and workstreams.</p>
          </div>
          <div className="hero-btn-group">
            <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
              <FolderPlus size={16} />
              <span>Launch New Stream</span>
            </button>
          </div>
        </div>

        <StatsGrid stats={stats} />

        <div className="control-bar">
          <div className="tab-group">
            {[
              { key: 'all', label: 'All Projects' },
              { key: 'in progress', label: 'In Progress' },
              { key: 'planning', label: 'Planning' },
              { key: 'completed', label: 'Completed' }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <div className="search-input-wrapper">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search workstreams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="split-layout">
          <div className="projects-grid">
            {loading ? (
              <div className="empty-state">
                <p>Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <Layers className="empty-icon" />
                <h3>No projects found in this view</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
                  {searchQuery ? `No matches for "${searchQuery}"` : 'Get started by creating your first stream.'}
                </p>
                <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                  <FolderPlus size={16} />
                  <span>Create Project</span>
                </button>
              </div>
            ) : (
              projects.map((proj) => (
                <ProjectCard
                  key={proj.id}
                  project={proj}
                  onDelete={handleDeleteProject}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))
            )}
          </div>

          <aside>
            <ActivityFeed activities={activities} />
          </aside>
        </div>
      </main>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}

export default App;

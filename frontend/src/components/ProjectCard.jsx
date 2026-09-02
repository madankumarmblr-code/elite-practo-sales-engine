import React from 'react';
import { User, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function ProjectCard({ project, onDelete, onUpdateStatus }) {
  const getPriorityClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      default: return 'priority-medium';
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="status-badge status-completed-pill">
            <CheckCircle size={13} /> Completed
          </span>
        );
      case 'In Progress':
        return (
          <span className="status-badge status-in-progress-pill">
            <Clock size={13} /> In Progress
          </span>
        );
      default:
        return (
          <span className="status-badge status-planning-pill">
            <AlertCircle size={13} /> Planning
          </span>
        );
    }
  };

  const handleNextStatus = () => {
    const sequence = {
      'Planning': 'In Progress',
      'In Progress': 'Completed',
      'Completed': 'Planning'
    };
    const next = sequence[project.status] || 'Planning';
    const newProgress = next === 'Completed' ? 100 : next === 'In Progress' ? 50 : 15;
    onUpdateStatus(project.id, { status: next, progress: newProgress });
  };

  return (
    <div className="project-card">
      <div className="project-top">
        <div className="project-meta-row">
          <span className="category-tag">{project.category || 'General'}</span>
          <span className={`priority-badge ${getPriorityClass(project.priority)}`}>
            {project.priority || 'Medium'}
          </span>
        </div>

        <h3>{project.title}</h3>
        <p>{project.description || 'No detailed description provided for this workstream.'}</p>
      </div>

      <div className="progress-section">
        <div className="progress-labels">
          <span>Execution Progress</span>
          <span>{project.progress || 0}%</span>
        </div>
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${Math.min(100, Math.max(0, project.progress || 0))}%` }} 
          />
        </div>
      </div>

      <div className="project-footer">
        <div className="owner-pill">
          <User size={14} />
          <span>{project.owner || 'You'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            type="button"
            onClick={handleNextStatus}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            title="Click to advance status"
          >
            {getStatusPill(project.status)}
          </button>

          <button 
            className="btn-danger-ghost"
            onClick={() => onDelete(project.id)}
            title="Delete project"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PortalProject, ProjectStatus } from '../types';
import { supabase, isConfigured } from '../supabaseClient';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: PortalProject[];
  addProject: (project: Omit<PortalProject, 'id'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<PortalProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const MOCK_PROJECTS: PortalProject[] = [
  {
    id: '1',
    name: 'Smith Wedding',
    clientName: 'Alex Doe',
    clientEmail: 'alex.doe@example.com',
    serviceType: 'Photography',
    eventDate: '2024-12-15',
    status: 'in_progress',
    coverImage: 'https://picsum.photos/800/600?random=1',
    progress: 65,
    currentStep: 'Editing',
    totalSteps: 10,
    manager: 'Admin'
  },
  {
    id: '2',
    name: 'Tech Corp Gala',
    clientName: 'Alex Doe',
    clientEmail: 'alex.doe@example.com',
    serviceType: 'Videography',
    eventDate: '2024-10-05',
    status: 'completed',
    coverImage: 'https://picsum.photos/800/600?random=2',
    progress: 100,
    currentStep: 'Delivered',
    totalSteps: 10,
    manager: 'Admin'
  }
];

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const { user } = useAuth();

  const fetchProjects = async () => {
    if (!isConfigured) {
      setProjects(MOCK_PROJECTS);
      return;
    }

    try {
      let query = supabase
        .from('portal_projects')
        .select(`
                *,
                manager_profile:profiles!portal_projects_manager_id_fkey(name)
            `);

      // If client, filter by their email or ID
      if (user && user.role === 'client') {
        query = query.eq('client_email', user.email);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setProjects(data.map((p: any) => ({
          id: p.id,
          name: p.name,
          clientName: p.client_name,
          clientEmail: p.client_email,
          serviceType: p.service_type,
          eventDate: p.event_date,
          status: p.status,
          coverImage: p.cover_image,
          progress: p.progress,
          currentStep: p.current_step,
          totalSteps: p.total_steps,
          manager: p.manager_profile?.name || p.manager || 'Admin'
        })));
      } else {
        // If valid query but no data, assume empty DB.
        // But if we are falling back due to missing table, it would have been caught in error.
        setProjects([]);
      }
    } catch (err: any) {
      console.warn("Error fetching projects, falling back to mock data:", err.message || err);
      setProjects(MOCK_PROJECTS);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const addProject = async (project: Omit<PortalProject, 'id'>) => {
    if (!isConfigured) {
      const newProject = { ...project, id: Math.random().toString() };
      setProjects([...projects, newProject as PortalProject]);
      return;
    }
    const { error } = await supabase.from('portal_projects').insert({
      name: project.name,
      client_name: project.clientName,
      client_email: project.clientEmail,
      service_type: project.serviceType,
      event_date: project.eventDate,
      status: project.status,
      cover_image: project.coverImage,
      progress: project.progress,
      current_step: project.currentStep,
      total_steps: project.totalSteps,
      manager: project.manager
    });
    if (error) console.error("Error adding project:", error.message);
    else fetchProjects();
  };

  const updateProject = async (id: string, updates: Partial<PortalProject>) => {
    if (!isConfigured) {
      setProjects(projects.map(p => p.id === id ? { ...p, ...updates } : p));
      return;
    }
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.clientName) dbUpdates.client_name = updates.clientName;
    if (updates.clientEmail) dbUpdates.client_email = updates.clientEmail;
    if (updates.serviceType) dbUpdates.service_type = updates.serviceType;
    if (updates.eventDate) dbUpdates.event_date = updates.eventDate;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.coverImage) dbUpdates.cover_image = updates.coverImage;
    if (updates.progress) dbUpdates.progress = updates.progress;
    if (updates.currentStep) dbUpdates.current_step = updates.currentStep;

    const { error } = await supabase.from('portal_projects').update(dbUpdates).eq('id', id);
    if (error) console.error("Error updating project:", error.message);
    else fetchProjects();
  };

  const deleteProject = async (id: string) => {
    if (!isConfigured) {
      setProjects(projects.filter(p => p.id !== id));
      return;
    }
    const { error } = await supabase.from('portal_projects').delete().eq('id', id);
    if (error) console.error("Error deleting project:", error.message);
    else fetchProjects();
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject, updateProject, deleteProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjects must be used within a ProjectProvider');
  return context;
};

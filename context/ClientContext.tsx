
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClientUser } from '../types';
import { supabase, isConfigured } from '../supabaseClient';
import { useAuth } from './AuthContext';

interface ClientContextType {
  clients: ClientUser[];
  addClient: (client: Omit<ClientUser, 'id' | 'memberSince' | 'totalSpent' | 'avatar'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<ClientUser>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

const MOCK_CLIENTS: ClientUser[] = [
    {
        id: '1',
        name: 'Alex Doe',
        email: 'alex.doe@example.com',
        company: 'Creative Co',
        phone: '123-456-7890',
        address: '123 Main St',
        avatar: 'https://ui-avatars.com/api/?name=Alex+Doe',
        accountType: 'vip',
        status: 'active',
        role: 'client',
        totalSpent: 1500,
        memberSince: '2024-01-01'
    }
];

export const ClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<ClientUser[]>([]);
  const { user } = useAuth();

  const fetchClients = async () => {
    if (!isConfigured) {
        setClients(MOCK_CLIENTS);
        return;
    }
    
    try {
        // Fetch from 'profiles' (was app_users)
        const { data, error } = await supabase.from('profiles').select('*');
        
        if (error) {
            throw error;
        }

        if (data && data.length > 0) {
            setClients(data.map((c: any) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                company: c.company,
                phone: c.phone,
                address: c.address,
                avatar: c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
                accountType: c.account_type || 'customer',
                status: c.status || 'active',
                role: c.role || 'client',
                totalSpent: c.total_spent || 0,
                memberSince: c.member_since
            })));
        } else {
            // If DB is empty, but we are logged in as demo-admin, show mock clients so the dashboard isn't empty
            if (user?.id === 'demo-admin') {
                setClients(MOCK_CLIENTS);
            } else {
                setClients([]);
            }
        }
    } catch (err) {
        console.warn("Error fetching clients from DB, falling back to mock data:", err);
        setClients(MOCK_CLIENTS);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const addClient = async (clientData: Omit<ClientUser, 'id' | 'memberSince' | 'totalSpent' | 'avatar'>) => {
    if (!isConfigured || user?.id === 'demo-admin') {
        const newClient = { ...clientData, id: Math.random().toString(), memberSince: new Date().toISOString(), totalSpent: 0, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientData.name)}` };
        setClients([...clients, newClient as ClientUser]);
        return;
    }
    
    // Insert into profiles with a default password for manually created users by admin
    const { error } = await supabase.from('profiles').insert({
        name: clientData.name,
        email: clientData.email,
        company: clientData.company,
        phone: clientData.phone,
        address: clientData.address,
        role: clientData.role,
        status: clientData.status,
        account_type: clientData.accountType,
        password: 'password123', // Default password
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientData.name)}`
    });

    if (!error) {
        fetchClients();
    } else {
        console.error("Error adding client:", error);
    }
  };

  const updateClient = async (id: string, updates: Partial<ClientUser>) => {
    if (!isConfigured || user?.id === 'demo-admin') {
        setClients(clients.map(c => c.id === id ? { ...c, ...updates } : c));
        return;
    }
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.company) dbUpdates.company = updates.company;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.accountType) dbUpdates.account_type = updates.accountType;
    if (updates.status) dbUpdates.status = updates.status;

    await supabase.from('profiles').update(dbUpdates).eq('id', id);
    fetchClients();
  };

  const deleteClient = async (id: string) => {
    if (!isConfigured || user?.id === 'demo-admin') {
        setClients(clients.filter(c => c.id !== id));
        return;
    }
    await supabase.from('profiles').delete().eq('id', id);
    fetchClients();
  };

  return (
    <ClientContext.Provider value={{ clients, addClient, updateClient, deleteClient }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) throw new Error('useClients must be used within a ClientProvider');
  return context;
};

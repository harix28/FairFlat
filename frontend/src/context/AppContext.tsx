import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { groupApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  members?: { user: User; role: string }[];
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  groups: Group[];
  refreshGroups: () => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Basic session restore check
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    } else {
      // If no session but trying to access protected route, let ProtectedRoute handle it or redirect here.
    }
  }, []);

  const refreshGroups = async () => {
    if (!user) return;
    try {
      const res = await groupApi.getGroups();
      setGroups(res.data);
      if (res.data.length > 0 && !activeGroup) {
        setActiveGroup(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch groups', err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshGroups();
    } else {
      setGroups([]);
      setActiveGroup(null);
    }
  }, [user]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveGroup(null);
    navigate('/');
  };

  return (
    <AppContext.Provider value={{ user, setUser, activeGroup, setActiveGroup, groups, refreshGroups, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

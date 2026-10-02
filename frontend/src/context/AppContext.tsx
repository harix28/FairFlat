import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
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
  socketConnected: boolean;

  setActiveGroup: (group: Group | null) => void;
  groups: Group[];
  refreshGroups: () => Promise<void>;
  logout: () => void;
  io: Socket; // expose socket
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const navigate = useNavigate();

  // Initialise socket once
  const socket: Socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
    autoConnect: false,
  });
  const [socketConnected, setSocketConnected] = useState(false);

  // Connect socket when user is available
  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit('join_user', user.id);
      const activeGroupId = localStorage.getItem('fairflat_active_group');
      if (activeGroupId) socket.emit('join_group', activeGroupId);
    }
    // listen for connection events
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [user]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Session restore
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
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
    if (user) refreshGroups();
    else {
      setGroups([]);
      setActiveGroup(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveGroup(null);
    navigate('/');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        activeGroup,
        setActiveGroup,
        groups,
        refreshGroups,
        logout,
        io: socket,
        socketConnected,
      }}
    >
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

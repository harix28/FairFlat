import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
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
  io: Socket;
  socketConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const navigate = useNavigate();

  // Use a ref so the socket instance is stable across renders
  const socketRef = useRef<Socket>(
    socketIO(
      import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000',
      { autoConnect: false }
    )
  );
  const socket = socketRef.current;

  // Connect / disconnect socket when user changes
  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (user) {
      socket.connect();
      socket.emit('join_user', user.id);
      const activeGroupId = localStorage.getItem('fairflat_active_group');
      if (activeGroupId) socket.emit('join_group', activeGroupId);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Session restore on mount
  useEffect(() => {
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

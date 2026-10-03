import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Lock, Loader2, Users, BarChart3, LogOut, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { Link } from 'react-router-dom';

const Settings = () => {
  const { user, setUser, logout, activeGroup } = useAppContext();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put('/auth/profile', data);
      return res.data;
    },
    onSuccess: (data) => {
      // Update local storage and context
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setSuccessMsg('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: () => {
      alert('Failed to update profile');
    }
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      return alert('Passwords do not match');
    }
    
    const payload: any = { name };
    if (password) payload.password = password;
    
    updateMutation.mutate(payload);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account details and app preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your display name and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Display Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">New Password (Optional)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="password" 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>
              </div>

              {password && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100 font-medium">
                  {successMsg}
                </div>
              )}

              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Other Tools</CardTitle>
              <CardDescription>Manage flats or check reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/app/groups" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-105 transition-transform"><Users className="w-5 h-5"/></div>
                  <div>
                    <h4 className="font-medium text-slate-900">Manage Groups</h4>
                    <p className="text-xs text-slate-500">Create or join flats</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
              
              {activeGroup && (
                <Link to="/app/analytics" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform"><BarChart3 className="w-5 h-5"/></div>
                    <div>
                      <h4 className="font-medium text-slate-900">Analytics & Reports</h4>
                      <p className="text-xs text-slate-500">Download group PDFs</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </Link>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-red-100 bg-red-50/30 hover:bg-red-50/80 transition-colors cursor-pointer" onClick={() => logout()}>
            <CardContent className="p-4 flex items-center justify-center gap-2 text-red-600 font-medium">
              <LogOut className="w-5 h-5" /> 
              Sign out of Roomio
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;

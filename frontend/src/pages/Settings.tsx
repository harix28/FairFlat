import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User, Lock, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

const Settings = () => {
  const { user, login } = useAppContext();
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
      const token = localStorage.getItem('fairflat_token');
      login(data.user, token!);
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account details and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your display name and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  className="pl-9" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>New Password (Optional)</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="password" 
                  className="pl-9" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </div>
            </div>

            {password && (
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input 
                    type="password" 
                    className="pl-9" 
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
    </div>
  );
};

export default Settings;

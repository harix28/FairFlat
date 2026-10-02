import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, Settings, Copy, Check, Plus, LogIn } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { groupApi } from '../services/api';

const Groups = () => {
  const { user, activeGroup, refreshGroups } = useAppContext();
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  
  // State for creating/joining
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCopyLink = () => {
    if (!activeGroup) return;
    navigator.clipboard.writeText(activeGroup.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateGroup = async () => {
    if (!activeGroup || !editGroupName.trim()) return;
    setIsSubmitting(true);
    try {
      await groupApi.updateGroup(activeGroup.id, { name: editGroupName });
      await refreshGroups();
      setShowSettings(false);
    } catch (err) {
      alert('Failed to update group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    if (!confirm('Are you sure you want to leave this group?')) return;
    setIsSubmitting(true);
    try {
      await groupApi.leaveGroup(activeGroup.id);
      await refreshGroups();
      setShowSettings(false);
    } catch (err) {
      alert('Failed to leave group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await groupApi.createGroup({ name: newGroupName });
      await refreshGroups();
      setNewGroupName('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await groupApi.joinGroup({ inviteCode: joinCode.trim().toUpperCase() });
      await refreshGroups();
      setJoinCode('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join group. Check the invite code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeGroup) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Groups</h1>
          <p className="text-slate-500 mt-1">You aren't in any groups yet. Create or join one to get started.</p>
        </div>

        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500" /> Create a New Group</CardTitle>
              <CardDescription>Start a new group with your flatmates</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g. Krishna Residency"
                    className="w-full p-2 border border-slate-300 rounded-md outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">Create Group</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LogIn className="w-5 h-5 text-emerald-500" /> Join an Existing Group</CardTitle>
              <CardDescription>Enter an invite code from a flatmate</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Invite Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    placeholder="e.g. A1B2C3D4"
                    className="w-full p-2 border border-slate-300 rounded-md outline-none focus:border-emerald-500 font-mono uppercase"
                    required
                  />
                </div>
                <Button type="submit" variant="secondary" disabled={isSubmitting} className="w-full">Join Group</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const members = activeGroup.members || [];
  const expensesCount = (activeGroup as any)._count?.expenses || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{activeGroup.name}</h1>
          <p className="text-slate-500 mt-1">Manage your flatmates and group settings.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => {
            setEditGroupName(activeGroup.name);
            setShowSettings(true);
          }}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Members ({members.length})
            </CardTitle>
            <CardDescription>People currently in this group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((m: any, i: number) => {
                const isMe = m.user.id === user?.id;
                // Generate a consistent color based on name length just for UI fun
                const colors = ['bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600', 'bg-orange-100 text-orange-600', 'bg-purple-100 text-purple-600'];
                const color = colors[i % colors.length];

                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${color}`}>
                        {m.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{m.user.name} {isMe && '(You)'}</h4>
                        <p className="text-sm text-slate-500">{m.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {m.role === 'owner' ? 'Admin' : 'Member'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invite Code</CardTitle>
              <CardDescription>Share this code to invite others</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <input 
                  type="text" 
                  readOnly 
                  value={activeGroup.inviteCode} 
                  className="bg-transparent text-sm font-mono w-full outline-none text-slate-600 px-2 tracking-widest font-bold"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Group Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-sm">Total Members</span>
                <span className="font-medium text-slate-900 text-sm">{members.length}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-sm">Total Expenses</span>
                <span className="font-medium text-slate-900 text-sm">{expensesCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Base Currency</span>
                <span className="font-medium text-slate-900 text-sm">INR (₹)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setShowSettings(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl z-50 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Group Settings</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Group Name</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={e => setEditGroupName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h4>
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleLeaveGroup}
                  disabled={isSubmitting}
                >
                  Leave Group
                </Button>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowSettings(false)}>Cancel</Button>
              <Button onClick={handleUpdateGroup} disabled={isSubmitting || !editGroupName.trim()}>Save Changes</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Groups;

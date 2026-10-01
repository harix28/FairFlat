import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, UserPlus, Settings, Copy } from 'lucide-react';

const Groups = () => {
  const members = [
    { name: 'Hari (You)', email: 'hari@example.com', role: 'Admin', avatar: 'H', color: 'bg-blue-100 text-blue-600' },
    { name: 'Rahul', email: 'rahul@example.com', role: 'Member', avatar: 'R', color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Aman', email: 'aman@example.com', role: 'Member', avatar: 'A', color: 'bg-orange-100 text-orange-600' },
    { name: 'Priya', email: 'priya@example.com', role: 'Member', avatar: 'P', color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Krishna Residency</h1>
          <p className="text-slate-500 mt-1">Manage your flatmates and group settings.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
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
              {members.map((member, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${member.color}`}>
                      {member.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{member.name}</h4>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${member.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invite Link</CardTitle>
              <CardDescription>Share this link to invite others</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <input 
                  type="text" 
                  readOnly 
                  value="fairflat.app/join/krishna-123" 
                  className="bg-transparent text-sm w-full outline-none text-slate-600 px-2"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => alert('Link copied!')}>
                  <Copy className="w-4 h-4 text-slate-500" />
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
                <span className="text-slate-500 text-sm">Created On</span>
                <span className="font-medium text-slate-900 text-sm">Sep 1, 2026</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-sm">Total Expenses</span>
                <span className="font-medium text-slate-900 text-sm">24</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Base Currency</span>
                <span className="font-medium text-slate-900 text-sm">INR (₹)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Groups;

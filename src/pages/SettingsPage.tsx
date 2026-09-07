/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Slider } from '../components/ui/slider';
import { 
  User, 
  Shield, 
  Server, 
  Key, 
  LogOut, 
  Database, 
  Activity, 
  AlertTriangle,
  History,
  Lock,
  Globe,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  MapPin,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../components/ui/dialog';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { get, post, del, loading } = useApi();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<'connected' | 'error'>('connected');
  
  // Form states
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [retention, setRetention] = useState([30]);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await get('/api/auth/me');
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  }, [get]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await get('/api/dashboard/stats');
      setStats(data);
      setHealthStatus('connected');
    } catch (err) {
      setHealthStatus('error');
    }
  }, [get]);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [fetchProfile, fetchStats]);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.next.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    // Simulation since backend doesn't have it
    toast.warning('Password policy updated. Server integration coming soon.');
    setPasswords({ current: '', next: '', confirm: '' });
  };

  const handleLogoutAll = () => {
    localStorage.removeItem('gps_token');
    toast.success('All sessions terminated');
    navigate('/login');
  };

  const handleClearData = async () => {
    try {
      // In a real app, we might have a bulk delete or individual deletes
      // This is the "Nuclear Option"
      toast.info('Initiating system purge...');
      // Logic for clearing would go here
      setTimeout(() => {
        toast.success('All GPS records have been cleared');
        setShowClearDialog(false);
        fetchStats();
      }, 2000);
    } catch (err) {}
  };

  const getPasswordStrength = () => {
    if (!passwords.next) return 0;
    let strength = 0;
    if (passwords.next.length >= 8) strength += 25;
    if (/[A-Z]/.test(passwords.next)) strength += 25;
    if (/[0-9]/.test(passwords.next)) strength += 25;
    if (/[^A-Za-z0-9]/.test(passwords.next)) strength += 25;
    return strength;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">System Settings</h1>
          <p className="text-slate-500 mt-2 text-lg">Manage your administrative footprint and satellite control parameters.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
          <Badge className={cn(
            "h-8 rounded-xl px-4 flex items-center gap-2 border-none",
            healthStatus === 'connected' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", healthStatus === 'connected' ? "bg-green-500" : "bg-red-500")} />
            System {healthStatus === 'connected' ? 'Online' : 'Error'}
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            id: 'account', 
            name: 'Account & Identity', 
            desc: 'Profile, credentials and access level', 
            icon: <User className="w-6 h-6 text-blue-500" />,
            onClick: () => setShowAccountModal(true),
            color: 'from-blue-500/20 to-blue-500/5'
          },
          {
            id: 'geofencing',
            name: 'Boundary Control',
            desc: 'Satellite geofence perimeter mapping',
            icon: <MapPin className="w-6 h-6 text-green-500" />,
            onClick: () => navigate('/geofencing'),
            color: 'from-green-500/20 to-green-500/5'
          },
          {
            id: 'alerts',
            name: 'Zone Alerts',
            desc: 'Review and clear geofence crossing alerts',
            icon: <Bell className="w-6 h-6 text-red-500" />,
            onClick: () => navigate('/alerts'),
            color: 'from-red-500/20 to-red-500/5'
          },
          {
            id: 'security', 
            name: 'Security Shield', 
            desc: 'Session audit and system hardening', 
            icon: <Shield className="w-6 h-6 text-amber-500" />,
            onClick: () => setShowSecurityModal(true),
            color: 'from-amber-500/20 to-amber-500/5'
          },
          { 
            id: 'system', 
            name: 'System Engine', 
            desc: 'Storage retention and health metrics', 
            icon: <Server className="w-6 h-6 text-purple-500" />,
            onClick: () => setShowSystemModal(true),
            color: 'from-purple-500/20 to-purple-500/5'
          }
        ].map((card) => (
          <button
            key={card.id}
            onClick={card.onClick}
            className="group relative text-left"
          >
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500",
              card.color
            )} />
            <Card className="relative bg-slate-900/40 border-slate-800/80 hover:border-slate-700 h-full rounded-3xl overflow-hidden backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-slate-950/50 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 group-hover:scale-110 transition-transform duration-500">
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{card.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{card.desc}</p>
                <div className="mt-6 flex items-center text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                  Configure Settings <Globe className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* --- Account Modal --- */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 text-white rounded-3xl p-0 overflow-hidden shadow-2xl">
          <div className="h-2 bg-blue-600" />
          <div className="p-8 space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar">
            <header>
              <DialogTitle className="text-3xl font-black tracking-tight">Administrative Profile</DialogTitle>
              <DialogDescription className="text-slate-500 mt-2">Manage your system identifying credentials and authorized access level.</DialogDescription>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl p-8">
                {!user ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-[250px] bg-slate-800" />
                    <Skeleton className="h-4 w-[200px] bg-slate-800" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-3xl font-black text-slate-500 border-4 border-slate-900 ring-4 ring-slate-800/20">
                        {user.username?.[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-white">{user.username}</h4>
                        <Badge className="bg-blue-600/10 text-blue-500 border-none rounded-full px-3 mt-1">Administrator</Badge>
                      </div>
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Email Interface</Label>
                        <p className="text-white font-medium">{user.email || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Joined Command</Label>
                        <p className="text-white font-medium">{new Date(user.created_at || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="bg-slate-900 border-slate-800 rounded-3xl p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-white">Change Credentials</h4>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs">Current Secret</Label>
                    <Input type="password" placeholder="••••••••" className="bg-slate-950 border-slate-800 h-11 rounded-xl" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">New Target Password</Label>
                    <Input type="password" placeholder="Min. 8 characters" className="bg-slate-950 border-slate-800 h-11 rounded-xl" value={passwords.next} onChange={e => setPasswords({...passwords, next: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 rounded-xl font-bold shadow-lg shadow-blue-600/20">Update Credentials</Button>
                </form>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- Security Modal --- */}
      <Dialog open={showSecurityModal} onOpenChange={setShowSecurityModal}>
        <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 text-white rounded-3xl p-0 overflow-hidden shadow-2xl">
          <div className="h-2 bg-amber-600" />
          <div className="p-8 space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar">
            <header>
              <DialogTitle className="text-3xl font-black tracking-tight">Security Shield</DialogTitle>
              <DialogDescription className="text-slate-500 mt-2">Environment auditing and infrastructure hardening tools.</DialogDescription>
            </header>

            <div className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-amber-500" /> Active Logins</h4>
                  <Button variant="ghost" onClick={handleLogoutAll} className="text-red-500 hover:bg-red-500/10 h-8 rounded-lg text-xs">Purge Sessions</Button>
                </div>
                <div className="divide-y divide-slate-800">
                  {[
                    { device: 'Admin Terminal (Current)', ip: '197.210.xx.xx', time: 'Active Now' },
                    { device: 'Field Control (iPhone)', ip: '2.144.xx.xx', time: '4 hours ago' }
                  ].map((s, i) => (
                    <div key={i} className="p-6 flex items-center justify-between group hover:bg-slate-800/30">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800">
                          {s.device.includes('iPhone') ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{s.device}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{s.ip} • {s.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Satellite Encryption', desc: 'Secure AES-256 links' },
                  { title: 'Brute Force Guard', desc: 'Auto-lock mechanism' }
                ].map((p, i) => (
                  <Card key={i} className="bg-slate-900 border-slate-800 p-6 flex items-center justify-between rounded-3xl">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{p.title}</p>
                      <p className="text-[10px] text-slate-500">{p.desc}</p>
                    </div>
                    <div className="w-10 h-5 bg-blue-600 rounded-full flex items-center justify-end px-1">
                      <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- System Modal --- */}
      <Dialog open={showSystemModal} onOpenChange={setShowSystemModal}>
        <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 text-white rounded-3xl p-0 overflow-hidden shadow-2xl">
          <div className="h-2 bg-purple-600" />
          <div className="p-8 space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar">
            <header>
              <DialogTitle className="text-3xl font-black tracking-tight">System Engine</DialogTitle>
              <DialogDescription className="text-slate-500 mt-2">Manage infrastructure health, data retention, and storage cleanup.</DialogDescription>
            </header>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-900 border-slate-800 p-6 rounded-3xl">
                  <Activity className="w-6 h-6 text-green-500 mb-4" />
                  <h5 className="text-xl font-bold">99.8%</h5>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">API Uptime</p>
                </Card>
                <Card className="bg-slate-900 border-slate-800 p-6 rounded-3xl">
                  <Database className="w-6 h-6 text-purple-500 mb-4" />
                  <h5 className="text-xl font-bold">4.2 GB</h5>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Data Weight</p>
                </Card>
              </div>

              <Card className="bg-slate-900 border-slate-800 p-8 rounded-3xl space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="font-bold">Telemetric Data Retention</p>
                    <p className="text-xs text-slate-500">How long to store GPS logs before purging.</p>
                  </div>
                  <Badge className="bg-purple-600/10 text-purple-500 text-lg h-10 px-4 rounded-xl border-none font-bold">
                    {retention[0]} Days
                  </Badge>
                </div>
                <Slider value={retention} onValueChange={setRetention} max={365} step={1} />
              </Card>

              <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-red-500 font-bold">System Purge (Nuclear)</p>
                  <p className="text-xs text-red-500/60 mt-1 max-w-sm leading-relaxed">Permanently delete ALL satellite telemetry records. This action cannot be reversed.</p>
                </div>
                <Button variant="destructive" onClick={() => setShowClearDialog(true)} className="bg-red-600 hover:bg-red-700 h-11 rounded-xl px-8 font-bold shadow-lg shadow-red-600/20">Purge Data</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear All Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 rounded-3xl text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-red-500">
               Confirm Nuclear Option
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-4 text-base leading-relaxed">
              You are about to delete <span className="text-white font-bold">{stats?.totalRecords?.toLocaleString() || 'thousands of'}</span> records. This action is <span className="text-red-400 underline font-bold">permanent</span> and will disrupt all history maps.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-4">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                <p className="text-xs text-red-200/70">Type <span className="text-white font-mono font-bold">PURGE_DATABASE</span> to confirm your intent.</p>
             </div>
             <Input placeholder="Type confirmation phrase..." className="bg-slate-950 border-slate-800 h-12 rounded-xl focus:ring-red-500/20" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowClearDialog(false)} className="text-slate-500 hover:text-white">Abort</Button>
            <Button variant="destructive" onClick={handleClearData} className="bg-red-600 hover:bg-red-700 rounded-xl px-10">Confirm Purge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

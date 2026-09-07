/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { DeviceResponse } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  Monitor, 
  Trash2, 
  Edit2, 
  Eye, 
  Plus, 
  Clipboard, 
  Check, 
  Search,
  LayoutGrid,
  List,
  Info,
  Clock,
  Activity,
  Shield
} from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export default function DevicesPage() {
  const { get, del, patch, loading } = useApi();
  const navigate = useNavigate();
  
  const [devices, setDevices] = useState<DeviceResponse[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Dialog states
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Selection
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const data = await get('/api/devices');
      setDevices(data);
    } catch (err) {
      console.error('Failed to fetch devices', err);
    }
  }, [get]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleUpdateName = async (deviceId: string) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    
    try {
      await patch(`/api/devices/${deviceId}`, { name: editValue });
      setDevices(prev => prev.map(d => d.device_id === deviceId ? { ...d, name: editValue } : d));
      toast.success('Device name updated');
    } catch (err) {
      // Error handled by useApi
    } finally {
      setEditingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await del(`/api/devices/${deleteId}`);
      toast.success(`Tracker ${deleteId} has been decommissioned`);
      setDevices(prev => prev.filter(d => d.device_id !== deleteId));
    } catch (err) {
      // Error handled by useApi
    } finally {
      setDeleteId(null);
    }
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.info('Device ID copied to clipboard');
  };

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.device_id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (device: DeviceResponse) => {
    if (!device.is_active) return 'inactive';
    if (!device.last_seen) return 'offline';
    
    // Ensure we parse as UTC by adding Z if missing
    const lastSeenStr = device.last_seen.endsWith('Z') ? device.last_seen : `${device.last_seen}Z`;
    const lastSeenDate = new Date(lastSeenStr);
    const minutes = differenceInMinutes(new Date(), lastSeenDate);
    return minutes < 5 ? 'online' : 'offline';
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/10 text-green-500 border-none px-2.5 py-0.5 rounded-full flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online</Badge>;
      case 'offline':
        return <Badge className="bg-slate-800 text-slate-400 border-none px-2.5 py-0.5 rounded-full">Offline</Badge>;
      case 'inactive':
        return <Badge className="bg-red-500/10 text-red-500 border-none px-2.5 py-0.5 rounded-full">Disabled</Badge>;
      default:
        return <Badge className="bg-slate-800 text-slate-400 border-none px-2.5 py-0.5 rounded-full">Unknown</Badge>;
    }
  };

  if (loading && devices.length === 0) return <LoadingSpinner text="Connecting to device fleet..." />;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Devices</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and configure your GPS tracking hardware.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Device
          </Button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="relative group max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
        <Input 
          placeholder="Search by name or device ID..." 
          className="bg-slate-800 border-slate-700 pl-10 h-11 rounded-xl focus:ring-blue-500/20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {devices.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700 border-dashed py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-900 border border-slate-700 rounded-3xl flex items-center justify-center mb-6">
              <Monitor className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No devices registered yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto mb-8">
              Connect your ESP32 and send GPS data to see devices here.
            </p>
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)} className="border-slate-700 text-slate-400">
              Registration Guide
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'table' ? (
            <Card className="bg-slate-800 border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <Table>
                <TableHeader className="bg-slate-900/50">
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Device ID</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Seen</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Records</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-700">
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id} className="border-slate-800 group hover:bg-slate-700/30 transition-colors">
                      <TableCell className="px-6 py-4">
                        {editingId === device.device_id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleUpdateName(device.device_id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(device.device_id)}
                              className="h-8 bg-slate-900 border-slate-600 text-sm max-w-[150px]"
                            />
                            <Check className="w-4 h-4 text-green-500" />
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-2 cursor-pointer group/name"
                            onClick={() => {
                              setEditingId(device.device_id);
                              setEditValue(device.name);
                            }}
                          >
                            <span className="text-sm font-medium text-white group-hover/name:text-blue-400 transition-colors">{device.name}</span>
                            <Edit2 className="w-3 h-3 text-slate-600 opacity-0 group-hover/name:opacity-100 transition-all" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-mono text-xs text-slate-400">
                        <div className="flex items-center gap-2 group/id">
                          {device.device_id}
                          <button 
                            onClick={() => handleCopy(device.device_id)}
                            className="p-1 hover:bg-slate-700 rounded opacity-0 group-hover/id:opacity-100 transition-all"
                          >
                            {copiedId === device.device_id ? <Check className="w-3 h-3 text-green-500" /> : <Clipboard className="w-3 h-3 text-slate-500" />}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs font-medium">
                        <StatusBadge status={getStatus(device)} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs text-slate-500">
                        {device.last_seen ? `${formatDistanceToNow(new Date(device.last_seen.endsWith('Z') ? device.last_seen : `${device.last_seen}Z`))} ago` : 'Never'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right font-mono text-xs text-blue-500 font-bold">
                        {device.record_count?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-slate-700 text-slate-400 hover:text-white"
                            onClick={() => navigate(`/map?device=${device.device_id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-red-500/10 text-slate-400 hover:text-red-400"
                            onClick={() => setDeleteId(device.device_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDevices.map(device => (
                <Card key={device.id} className="bg-slate-800 border-slate-700 rounded-2xl overflow-hidden group hover:border-slate-500 transition-all shadow-lg hover:shadow-black/40">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-slate-900/50 p-3 rounded-2xl">
                        <Monitor className="w-6 h-6 text-blue-500" />
                      </div>
                      <StatusBadge status={getStatus(device)} />
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 group/edit">
                          <h3 className="text-xl font-bold text-white truncate">{device.name}</h3>
                          <Edit2 
                            className="w-3 h-3 text-slate-500 cursor-pointer opacity-0 group-hover/edit:opacity-100" 
                            onClick={() => {
                              setEditingId(device.device_id);
                              setEditValue(device.name);
                            }}
                          />
                        </div>
                        <code className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-1">
                          ID: {device.device_id}
                          <button onClick={() => handleCopy(device.device_id)} className="hover:text-blue-400">
                             {copiedId === device.device_id ? <Check className="w-2.5 h-2.5 text-green-500" /> : <Clipboard className="w-2.5 h-2.5" />}
                          </button>
                        </code>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-700/50">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Records</p>
                          <p className="text-lg font-bold text-white">{device.record_count?.toLocaleString() || '0'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Last Seen</p>
                          <p className="text-xs text-slate-300 font-medium">
                            {device.last_seen ? `${formatDistanceToNow(new Date(device.last_seen.endsWith('Z') ? device.last_seen : `${device.last_seen}Z`))} ago` : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900/40 flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:text-white rounded-xl h-10"
                      onClick={() => navigate(`/map?device=${device.device_id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View Map
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 h-10 w-10 rounded-xl"
                      onClick={() => setDeleteId(device.device_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-500" />
              Retire Tracker?
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-2 text-base">
              Are you sure you want to delete <span className="text-white font-mono font-bold">{deleteId}</span>? 
              This will also purge all associated GPS records. This action cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-slate-400 hover:text-white">Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 rounded-xl px-6">Decommission Device</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registration Info Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-500" />
              Register Device
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex gap-4">
              <Info className="w-6 h-6 text-blue-500 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-bold text-blue-100">Automatic Registration</p>
                <p className="text-xs text-blue-200/70 leading-relaxed">
                  ESP32 Sentinel uses a push-to-register architecture. Devices are automatically provisioned the moment they submit their first valid GPS packet to the cloud.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Quick Setup Guide</h4>
              <div className="space-y-3">
                {[
                  { icon: Activity, title: 'Power ESP32', desc: 'Connect to 5V supply and verify link LED.' },
                  { icon: Clock, title: 'Fix GPS', desc: 'Ensure antenna has clear sky view for lock.' },
                  { icon: Monitor, title: 'Check Dashboard', desc: 'Device will appear here within 60 seconds.' },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <step.icon className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-200">{step.title}</p>
                      <p className="text-[10px] text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAddModalOpen(false)} className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl h-12">I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { AlertResponse } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  MapPin,
  Radio,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

function zoneStyle(zone: string) {
  const z = zone.toLowerCase();
  if (z.includes('grazing') && !z.includes('neighbor')) {
    return { dot: 'bg-green-500', badge: 'bg-green-500/10 text-green-500' };
  }
  if (z.includes('neighbor') || z.includes('buffer')) {
    return { dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-500' };
  }
  if (z.includes('outside') || z.includes('restricted')) {
    return { dot: 'bg-red-500', badge: 'bg-red-500/10 text-red-500' };
  }
  return { dot: 'bg-slate-500', badge: 'bg-slate-800 text-slate-400' };
}

export default function AlertsPage() {
  const { get, patch, post, del, loading } = useApi();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const fetchAlerts = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const data = await get(
        `/api/alerts?limit=${pageSize}&offset=${offset}&unread_only=${unreadOnly}`
      );
      setAlerts(data.alerts || []);
      setTotal(data.total || 0);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  }, [get, page, unreadOnly]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleMarkRead = async (id: number) => {
    try {
      await patch(`/api/alerts/${id}/read`, {});
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, is_read: true } : a)));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (err) {
      // handled by useApi
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await post('/api/alerts/read-all', {});
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnreadCount(0);
      toast.success('All alerts marked as read');
    } catch (err) {
      // handled by useApi
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await del(`/api/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
      setTotal(t => Math.max(0, t - 1));
      toast.success('Alert deleted');
    } catch (err) {
      // handled by useApi
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading && alerts.length === 0) return <LoadingSpinner text="Loading zone alerts..." />;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Zone Alerts
            {unreadCount > 0 && (
              <Badge className="bg-red-500/10 text-red-500 border-none rounded-full px-2.5">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Geofence crossings logged when a collar changes zone.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <Select
              value={unreadOnly ? 'unread' : 'all'}
              onValueChange={val => {
                setUnreadOnly(val === 'unread');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700 text-slate-300 rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white rounded-xl h-10"
          >
            <CheckCheck className="w-4 h-4 mr-2" /> Mark All Read
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/geofencing')}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white rounded-xl h-10"
          >
            <MapPin className="w-4 h-4 mr-2" /> Edit Zones
          </Button>
        </div>
      </header>

      {alerts.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700 border-dashed py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-900 border border-slate-700 rounded-3xl flex items-center justify-center mb-6">
              <Bell className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {unreadOnly ? 'No unread alerts' : 'No zone alerts yet'}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Alerts appear here whenever a tracked collar crosses from one geofence zone into
              another. Make sure your zones are drawn on the Geofencing page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800 border-slate-700 rounded-2xl overflow-hidden shadow-xl divide-y divide-slate-700">
          {alerts.map(alert => {
            const style = zoneStyle(alert.zone);
            const ts = alert.timestamp.endsWith('Z') ? alert.timestamp : `${alert.timestamp}Z`;
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between gap-4 p-5 transition-colors',
                  !alert.is_read && 'bg-blue-500/5'
                )}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      style.badge
                    )}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">
                        {alert.device_name || alert.device_id}
                      </span>
                      <Badge className={cn('border-none px-2 py-0.5 rounded-full text-[10px]', style.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', style.dot)} />
                        {alert.zone}
                      </Badge>
                      {!alert.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Radio className="w-3 h-3" /> {alert.device_id}
                      </span>
                      <span className="font-mono">
                        {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                      </span>
                      <span>{formatDistanceToNow(new Date(ts), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!alert.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-700 text-slate-400 hover:text-white"
                      onClick={() => handleMarkRead(alert.id)}
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-red-500/10 text-slate-400 hover:text-red-400"
                    onClick={() => handleDelete(alert.id)}
                    title="Delete alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {alerts.length} of {total} alerts
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="border-slate-700 bg-slate-800 text-slate-300 rounded-lg disabled:opacity-30"
            >
              Previous
            </Button>
            <div className="flex items-center px-2 text-xs font-bold text-slate-400">
              {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="border-slate-700 bg-slate-800 text-slate-300 rounded-lg disabled:opacity-30"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

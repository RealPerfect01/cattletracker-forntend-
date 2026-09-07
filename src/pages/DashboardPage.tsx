/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { useApi } from '../hooks/useApi';
import { DashboardStats } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Activity, 
  Database, 
  Monitor,
  RefreshCw,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapAutoBounds({ markers }: { markers: any[] }) {
  const map = useMap();
  const hasInitialFitRef = useRef<boolean>(false);

  useEffect(() => {
    if (markers.length > 0 && !hasInitialFitRef.current) {
      const bounds = L.latLngBounds(markers.map(m => [m.latitude, m.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      hasInitialFitRef.current = true;
    }
  }, [markers, map]);
  return null;
}

export default function DashboardPage() {
  const { get, loading } = useApi();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await get('/api/dashboard/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      if (isManual) setRefreshing(false);
    }
  }, [get]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, 30000); // 30 seconds auto-refresh

    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading && !stats) return <LoadingSpinner text="Initializing dashboard..." />;

  const statItems = [
    { 
      label: 'Tracked Cattle', 
      value: stats?.total_devices || 0, 
      icon: Monitor, 
      color: 'bg-green-500/20 text-green-500',
      description: 'Active herd members'
    },
    { 
      label: 'Movement Logs', 
      value: (stats?.total_records || 0).toLocaleString(), 
      icon: Database, 
      color: 'bg-blue-500/20 text-blue-500',
      description: 'Historical GPS records'
    },
    { 
      label: 'Active Grazing', 
      value: stats?.active_devices || 0, 
      icon: Activity, 
      color: 'bg-amber-500/20 text-amber-500',
      description: 'Online trackers'
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchStats(true)} 
          disabled={refreshing}
          className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statItems.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-slate-800 border-slate-700 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", stat.color)}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Latest Records Table */}
        <Card className="lg:col-span-3 bg-slate-800 border-slate-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
            <h3 className="font-semibold text-white">Latest GPS Records</h3>
            <Link to="/map" className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Device</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Coords</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Speed</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {stats?.latest_records.length ? (
                  stats.latest_records.map((record) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-slate-700/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/devices`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-300 group-hover:text-blue-400 transition-colors">
                          {record.device_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-600" />
                          {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-bold text-blue-400">{record.speed} <span className="text-[10px] text-slate-500">km/h</span></span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-slate-500">
                          {(() => {
                            const ts = record.timestamp.endsWith('Z') ? record.timestamp : `${record.timestamp}Z`;
                            return formatDistanceToNow(new Date(ts));
                          })()} ago
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No GPS records yet. Waiting for devices...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mini Map */}
        <Card className="lg:col-span-2 bg-slate-800 border-slate-700 overflow-hidden flex flex-col h-[480px]">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h3 className="font-semibold text-white">Device Locations</h3>
          </div>
          <div className="flex-1 relative z-0">
            {stats?.latest_records.length ? (
              <MapContainer 
                center={[0, 0]} 
                zoom={2} 
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapAutoBounds markers={stats.latest_records} />
                {stats.latest_records.map((record) => (
                  <Marker 
                    key={record.id} 
                    position={[record.latitude, record.longitude]}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-sm mb-1">{record.device_id}</p>
                        <p className="text-xs text-slate-500 mb-1">{record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}</p>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Speed</span>
                          <span className="text-xs font-bold text-blue-600">{record.speed} km/h</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900/50 text-slate-600 gap-3">
                <MapPin className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No location data available</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

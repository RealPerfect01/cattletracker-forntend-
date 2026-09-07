/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { DeviceResponse, GPSDataResponse, CommandCreate, CommandResponse } from '../types';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { 
  ChevronLeft, 
  Trash2, 
  MapPin, 
  Activity, 
  Clock,
  Download,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  TrendingUp,
  Timer,
  Hash,
  Edit3,
  Volume2,
  Radio,
  RefreshCw,
  Power,
  Music,
  Send,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { useGeofenceMonitoring } from '../hooks/useGeofenceMonitoring';
import { Polygon, Tooltip } from 'react-leaflet';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_RANGE = '24';

// --- Helpers ---

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getSpeedColor(speed: number) {
  if (speed < 10) return "#eab308"; // Slow - Yellow
  if (speed < 50) return "#3b82f6"; // Mid - Blue
  return "#ef4444"; // Fast - Red
}

// --- Sub-components ---

function MapController({ points }: { points: [number, number][] }) {
  const map = useMap();
  const lastPointsHashRef = useRef<string>('');

  useEffect(() => {
    if (points.length === 0) return;
    
    const pointsHash = JSON.stringify(points);
    if (pointsHash !== lastPointsHashRef.current) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      lastPointsHashRef.current = pointsHash;
    }
  }, [map, points]);
  return null;
}

// --- Main Component ---

export default function DeviceDetailPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { get, post, del, loading } = useApi();
  
  const [device, setDevice] = useState<DeviceResponse | null>(null);
  const [history, setHistory] = useState<GPSDataResponse[]>([]);
  const [range, setRange] = useState(DEFAULT_RANGE);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Command console state
  const [commands, setCommands] = useState<CommandResponse[]>([]);
  const [commandType, setCommandType] = useState<string>('PLAY_SOUND');
  const [audioFile, setAudioFile] = useState<string>('beep.wav');
  const [volume, setVolume] = useState<number>(0.5);
  const [isSendingCommand, setIsSendingCommand] = useState(false);

  // Geofence Monitoring
  const geofenceDevices = useMemo(() => {
    if (!device || history.length === 0) return [];
    return [{
      device_id: device.device_id,
      name: device.name,
      history: [history[0]] as any[] // Monitor based on latest position
    }];
  }, [device, history]);
  
  const { geofences } = useGeofenceMonitoring(geofenceDevices);

  const fetchDevice = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await get(`/api/devices/${deviceId}`);
      setDevice(data);
    } catch (err) {}
  }, [deviceId, get]);

  const fetchHistory = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await get(`/api/gps/device/${deviceId}?hours=${range}`);
      setHistory(data.records);
      setPlaybackIndex(0);
      setIsPlaying(false);
    } catch (err) {}
  }, [deviceId, range, get]);

  const fetchCommands = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await get(`/api/devices/${deviceId}/commands?limit=10`);
      if (Array.isArray(data)) {
        setCommands(data);
      }
    } catch (err) {
      console.error('Failed to fetch commands', err);
    }
  }, [deviceId, get]);

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) return;
    setIsSendingCommand(true);
    try {
      const payload: CommandCreate = {
        command_type: commandType,
        file: commandType === 'PLAY_SOUND' ? audioFile : null,
        volume: commandType === 'PLAY_SOUND' ? volume : null
      };
      await post(`/api/devices/${deviceId}/command`, payload);
      toast.success('Command successfully queued');
      fetchCommands();
    } catch (err) {
      toast.error('Failed to queue command');
    } finally {
      setIsSendingCommand(false);
    }
  };

  useEffect(() => {
    fetchDevice();
    fetchHistory();
    fetchCommands();

    const interval = setInterval(() => {
      fetchCommands();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDevice, fetchHistory, fetchCommands]);

  // Playback timer
  useEffect(() => {
    let interval: any;
    if (isPlaying && history.length > 0) {
      interval = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev >= history.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, history]);

  // Calculations
  const stats = useMemo(() => {
    if (history.length === 0) return { distance: 0, maxSpeed: 0, avgSpeed: 0, uptime: '0h' };
    
    let dist = 0;
    let maxS = 0;
    let sumS = 0;

    for (let i = 0; i < history.length; i++) {
      const curr = history[i];
      if (i > 0) {
        const prev = history[i - 1];
        dist += haversine(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      }
      maxS = Math.max(maxS, curr.speed);
      sumS += curr.speed;
    }

    const first = new Date(history[history.length - 1].timestamp);
    const last = new Date(history[0].timestamp);
    const uptimeDiff = last.getTime() - first.getTime();
    const hours = Math.floor(uptimeDiff / (1000 * 60 * 60));
    const mins = Math.floor((uptimeDiff % (1000 * 60 * 60)) / (1000 * 60));

    return {
      distance: dist,
      maxSpeed: maxS,
      avgSpeed: sumS / history.length,
      uptime: `${hours}h ${mins}m`
    };
  }, [history]);

  const exportCSV = () => {
    const headers = ['Timestamp', 'Latitude', 'Longitude', 'Speed(km/h)'];
    const rows = history.map(h => [h.timestamp, h.latitude, h.longitude, h.speed]);
    const content = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device_${deviceId}_${range}h.csv`;
    a.click();
  };

  const handleDelete = async () => {
    if (!deviceId) return;
    if (confirm(`Are you sure you want to delete ${device?.name? device.name : deviceId}? All GPS history will be lost.`)) {
      try {
        await del(`/api/devices/${deviceId}`);
        toast.success('Device deleted successfully');
        navigate('/devices');
      } catch (err) {}
    }
  };

  if (!device && loading) return <LoadingSpinner text="Consulting satellites..." />;
  if (!device) return <div className="p-12 text-center text-slate-500">Device not found or connection lost.</div>;

  const chronologicalHistory = useMemo(() => [...history].reverse(), [history]);

  const paginatedHistory = history.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(history.length / itemsPerPage);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/devices')} className="text-slate-400 hover:bg-slate-800 rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              <span className="cursor-pointer hover:text-blue-500 transition-colors" onClick={() => navigate('/devices')}>Devices</span>
              <span className="opacity-30">/</span>
              <span className="text-slate-400">{device.device_id}</span>
            </nav>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">{device.name}</h1>
              <Badge className={cn(
                "border-none px-2",
                device.is_active ? "bg-green-500/10 text-green-500" : "bg-slate-800 text-slate-500"
              )}>
                {device.is_active ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <p className="text-slate-500 font-mono text-xs mt-1 flex items-center gap-2">
              <Hash className="w-3 h-3" /> {device.device_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-slate-800 bg-slate-900/50 text-slate-400" onClick={() => navigate(`/devices`)}><Edit3 className="w-4 h-4 mr-2" /> Edit</Button>
          <Button variant="destructive" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-none" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
        </div>
      </header>

      {/* Range Selector */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <CardContent className="p-2">
          <Tabs value={range} onValueChange={setRange} className="w-full">
            <TabsList className="bg-transparent gap-2 w-full justify-start overflow-x-auto no-scrollbar">
              {[
                { label: '1H', value: '1' },
                { label: '6H', value: '6' },
                { label: '24H', value: '24' },
                { label: '7D', value: '168' },
                { label: '30D', value: '720' },
                { label: 'ALL', value: '8760' }
              ].map(t => (
                <TabsTrigger 
                  key={t.value} 
                  value={t.value} 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-500 rounded-lg px-6 h-9 font-bold text-[10px] uppercase tracking-widest"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Map */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden h-[600px] relative shadow-2xl">
            <MapContainer
              center={[0, 0]}
              zoom={2}
              className="h-full w-full"
              zoomControl={true}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapController points={history.map(h => [h.latitude, h.longitude]) as [number, number][]} />
              
              {/* Geofence Zones */}
              {geofences && (
                <>
                  {geofences.zones.grazing.coordinates.length > 0 && (
                    <Polygon 
                      positions={geofences.zones.grazing.coordinates} 
                      pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.2 }} 
                    >
                      <Tooltip sticky>Grazing Zone</Tooltip>
                    </Polygon>
                  )}
                  {geofences.zones.neighbor.coordinates.length > 0 && (
                    <Polygon 
                      positions={geofences.zones.neighbor.coordinates} 
                      pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15 }} 
                    >
                      <Tooltip sticky>Neighbor Buffer</Tooltip>
                    </Polygon>
                  )}
                  {geofences.zones.outside.coordinates.length > 0 && (
                    <Polygon 
                      positions={geofences.zones.outside.coordinates} 
                      pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1 }} 
                    >
                      <Tooltip sticky>Restricted Area</Tooltip>
                    </Polygon>
                  )}
                </>
              )}

              {/* Trail segments with speed coloring */}
              {chronologicalHistory.length > 1 && chronologicalHistory.slice(0, -1).map((h, i) => {
                const next = chronologicalHistory[i + 1];
                return (
                  <Polyline
                    key={`seg-${i}`}
                    positions={[[h.latitude, h.longitude], [next.latitude, next.longitude]]}
                    color={getSpeedColor(h.speed)}
                    weight={5}
                    opacity={0.8}
                  />
                );
              })}

              {/* Start/End Markers */}
              {history.length > 0 && (
                <>
                  <Marker position={[chronologicalHistory[0].latitude, chronologicalHistory[0].longitude]} icon={L.divIcon({ html: '<div class="w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-lg"></div>', className: '' })}>
                    <Popup>Trip Start</Popup>
                  </Marker>
                  <Marker position={[chronologicalHistory[chronologicalHistory.length - 1].latitude, chronologicalHistory[chronologicalHistory.length - 1].longitude]} icon={L.divIcon({ html: '<div class="w-6 h-6 bg-blue-500 border-4 border-white rounded-full shadow-2xl relative"><div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div></div>', className: 'pulse-marker' })}>
                    <Popup>Last Recorded Position</Popup>
                  </Marker>
                </>
              )}

              {/* Playback Marker */}
              {isPlaying && chronologicalHistory[playbackIndex] && (
                <Marker 
                  position={[chronologicalHistory[playbackIndex].latitude, chronologicalHistory[playbackIndex].longitude]}
                  icon={L.divIcon({ 
                    html: `<div class="bg-white p-1 rounded-full shadow-2xl animate-bounce"><div class="w-4 h-4 bg-orange-500 rounded-full"></div></div>`, 
                    className: '' 
                  })}
                  zIndexOffset={1000}
                />
              )}
            </MapContainer>

            {/* Map HUD */}
            <div className="absolute top-4 left-4 z-[1000] space-y-2">
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Navigation className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Current Path</p>
                    <p className="text-sm font-bold text-white">{history.length} data points</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-2 shadow-2xl flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-slate-800 rounded-xl"
                onClick={() => {
                  if (playbackIndex >= history.length - 1) setPlaybackIndex(0);
                  setIsPlaying(!isPlaying);
                }}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <div className="h-6 w-[1px] bg-slate-700" />
              <div className="w-40 h-1 bg-slate-800 rounded-full relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300" 
                  style={{ width: `${(playbackIndex / (history.length - 1)) * 100}%` }}
                />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-500 hover:text-white"
                onClick={() => { setPlaybackIndex(0); setIsPlaying(false); }}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Command Console */}
          <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-blue-500 animate-pulse" />
                  Command Console
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  Queue and transmit live commands to the collar hardware
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                POLLING INTERVAL: 5S
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Form: Queue New Command */}
              <form onSubmit={handleSendCommand} className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Queue New Command</h3>
                
                {/* Command Type selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400">Command Action</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'PLAY_SOUND', label: 'Play Sound', icon: Volume2, desc: 'Acoustic buzzer' },
                      { id: 'STOP_SOUND', label: 'Stop Sound', icon: Power, desc: 'Silence collar' },
                      { id: 'REBOOT', label: 'Reboot Device', icon: RefreshCw, desc: 'Reset MCU' },
                      { id: 'DEEP_SLEEP', label: 'Deep Sleep', icon: Radio, desc: 'Power save' }
                    ].map((type) => {
                      const Icon = type.icon;
                      const active = commandType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setCommandType(type.id)}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                            active 
                              ? "bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-500/10" 
                              : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={cn("w-4 h-4", active ? "text-blue-500" : "text-slate-400")} />
                            <span className="text-xs font-bold">{type.label}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 leading-tight">{type.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Fields: Play Sound */}
                {commandType === 'PLAY_SOUND' && (
                  <div className="space-y-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400">Select Audio File</Label>
                      <div className="flex flex-wrap gap-2">
                        {['beep.wav', 'alarm.wav', 'warning.wav', 'siren.wav'].map((file) => (
                          <button
                            key={file}
                            type="button"
                            onClick={() => setAudioFile(file)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                              audioFile === file 
                                ? "bg-blue-600 text-white border-blue-500" 
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                          >
                            <Music className="w-3.5 h-3.5 inline mr-1.5" />
                            {file}
                          </button>
                        ))}
                      </div>
                      
                      <div className="pt-2">
                        <Label className="text-[10px] text-slate-500">Or custom file path</Label>
                        <Input
                          type="text"
                          value={audioFile}
                          onChange={(e) => setAudioFile(e.target.value)}
                          placeholder="filename.wav"
                          className="h-8 bg-slate-950 border-slate-800 text-xs mt-1 text-white animate-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold text-slate-400">Buzzer Volume</Label>
                        <span className="text-xs font-mono font-bold text-blue-500">{Math.round(volume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Volume2 className="w-4 h-4 text-slate-500" />
                        <Slider
                          value={[volume]}
                          min={0.0}
                          max={1.0}
                          step={0.05}
                          onValueChange={(val) => setVolume(val[0])}
                          className="flex-1 py-4 cursor-pointer [&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-400"
                        />
                        <Volume2 className="w-4 h-4 text-blue-500" />
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSendingCommand}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl h-10 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSendingCommand ? 'Queueing Command...' : 'Queue Device Command'}
                </Button>
              </form>

              {/* Right: Command History Logs */}
              <div className="space-y-4 flex flex-col h-[340px]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transmission Log</h3>
                
                <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/30 p-2 scrollbar-thin scrollbar-thumb-slate-800">
                  {commands.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                      <Clock className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-bold">No commands queued</p>
                      <p className="text-[10px] opacity-60">Commands sent to this device will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {commands.map((cmd) => (
                        <div 
                          key={cmd.id} 
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/60 transition-all animate-in fade-in duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              cmd.command_type === 'PLAY_SOUND' ? 'bg-blue-500/10 text-blue-400' :
                              cmd.command_type === 'STOP_SOUND' ? 'bg-red-500/10 text-red-400' :
                              'bg-amber-500/10 text-amber-400'
                            )}>
                              {cmd.command_type === 'PLAY_SOUND' ? <Volume2 className="w-4 h-4" /> :
                               cmd.command_type === 'STOP_SOUND' ? <Power className="w-4 h-4" /> :
                               <RefreshCw className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white font-mono">{cmd.command_type}</span>
                                {cmd.volume !== null && (
                                  <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                                    v:{Math.round(cmd.volume * 100)}%
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                {cmd.file ? `File: ${cmd.file}` : 'System action'}
                              </p>
                              <p className="text-[8px] text-slate-500 mt-0.5">
                                {formatDistanceToNow(new Date(cmd.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>

                          <div>
                            {cmd.delivered ? (
                              <Badge className="bg-green-500/10 text-green-500 border-none px-2 py-0.5 text-[9px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Transmitted
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-500 border-none px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3" /> Queued
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Stats + History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Navigation className="w-4 h-4" /></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distance</span>
              </div>
              <div className="flex items-baseline gap-1">
                <h4 className="text-2xl font-bold text-white">{stats.distance.toFixed(1)}</h4>
                <span className="text-xs text-slate-500">KM</span>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><TrendingUp className="w-4 h-4" /></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Max Speed</span>
              </div>
              <div className="flex items-baseline gap-1">
                <h4 className="text-2xl font-bold text-white">{Math.round(stats.maxSpeed)}</h4>
                <span className="text-xs text-slate-500">KM/H</span>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Activity className="w-4 h-4" /></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Speed</span>
              </div>
              <div className="flex items-baseline gap-1">
                <h4 className="text-2xl font-bold text-white">{Math.round(stats.avgSpeed)}</h4>
                <span className="text-xs text-slate-500">KM/H</span>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><Timer className="w-4 h-4" /></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duration</span>
              </div>
              <h4 className="text-2xl font-bold text-white uppercase tabular-nums">{stats.uptime}</h4>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[348px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-900/50">
              <div>
                <CardTitle className="text-sm font-bold text-white">GPS History</CardTitle>
                <CardDescription className="text-[10px]">Recent position logging</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={exportCSV} className="text-blue-500 hover:bg-blue-500/10 h-8 px-3 rounded-lg text-xs font-bold">
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="overflow-y-auto h-full scrollbar-thin scrollbar-thumb-slate-800">
                <Table>
                  <TableHeader className="bg-slate-950/50 sticky top-0 z-10 backdrop-blur-sm">
                    <TableRow className="border-slate-800">
                      <TableHead className="text-[10px] font-bold uppercase py-2 h-auto text-slate-500">Time</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase py-2 h-auto text-slate-500">Coords</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase py-2 h-auto text-slate-500 text-right">Spd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory.map((h) => (
                      <TableRow key={h.id} className="border-slate-800/50 group hover:bg-slate-800/30">
                        <TableCell className="py-2 text-[10px] text-slate-400 font-medium">
                          {format(new Date(h.timestamp), 'HH:mm:ss')}
                          <div className="text-[8px] opacity-40">{format(new Date(h.timestamp), 'MMM d')}</div>
                        </TableCell>
                        <TableCell className="py-2 text-[9px] font-mono text-slate-500 group-hover:text-blue-400 transition-colors">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                            {h.stale && (
                              <span title="From the device's cached last-known fix, not a live GPS reading" className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-wider">
                                Cached
                              </span>
                            )}
                            {h.buffered && (
                              <span title="Sent late from the device's offline buffer" className="px-1 py-0.5 rounded bg-slate-700/60 text-slate-400 text-[8px] font-bold uppercase tracking-wider">
                                Buffered
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-[10px] font-bold text-white text-right">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded",
                            h.speed > 80 ? "text-red-500" : h.speed > 40 ? "text-blue-400" : "text-yellow-500"
                          )}>
                            {h.speed}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            {totalPages > 1 && (
              <div className="p-3 bg-slate-950/30 border-t border-slate-800 flex items-center justify-between">
                <p className="text-[10px] text-slate-500 tracking-tight">Showing {paginatedHistory.length} of {history.length}</p>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)}
                    className="h-6 w-6 rounded-md hover:bg-slate-800 disabled:opacity-20"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <div className="flex items-center px-2 text-[10px] font-bold text-slate-400">{page} / {totalPages}</div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={page === totalPages} 
                    onClick={() => setPage(p => p + 1)}
                    className="h-6 w-6 rounded-md hover:bg-slate-800 disabled:opacity-20"
                  >
                    <ChevronLeft className="w-3 h-3 rotate-180" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <style>{`
        .leaflet-container { background-color: #020617 !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

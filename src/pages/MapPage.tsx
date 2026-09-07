/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { useApi } from '../hooks/useApi';
import { DeviceResponse, GPSDataResponse } from '../types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  MapPin, 
  Navigation, 
  RefreshCw, 
  Layers, 
  Filter, 
  Clock, 
  Maximize, 
  Crosshair,
  Activity,
  ChevronUp,
  ChevronDown,
  Monitor
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { useGeofenceMonitoring } from '../hooks/useGeofenceMonitoring';
import { Polygon, Tooltip } from 'react-leaflet';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type ViewMode = 'live' | 'trail' | 'heatmap';

// --- Sub-components ---

function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map || points.length === 0) return;
    
    // @ts-ignore
    const heatLayer = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' }
    });
    
    heatLayer.addTo(map);
    layerRef.current = heatLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, points]);

  return null;
}

function MapAutoFit({ 
  markers, 
  points, 
  filterDevice,
  viewMode 
}: { 
  markers: GPSDataResponse[], 
  points: GPSDataResponse[],
  filterDevice: string,
  viewMode: string
}) {
  const map = useMap();
  const lastFilterRef = useRef<string | null>(null);
  const lastViewModeRef = useRef<string | null>(null);
  const hasInitialFitRef = useRef<boolean>(false);

  useEffect(() => {
    const allPoints = [...markers, ...points];
    if (allPoints.length === 0) return;

    const filterChanged = lastFilterRef.current !== filterDevice;
    const viewModeChanged = lastViewModeRef.current !== viewMode;

    if (!hasInitialFitRef.current || filterChanged || viewModeChanged) {
      const bounds = L.latLngBounds(allPoints.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      hasInitialFitRef.current = true;
      lastFilterRef.current = filterDevice;
      lastViewModeRef.current = viewMode;
    }
  }, [map, markers, points, filterDevice, viewMode]);

  return null;
}

function UserLocationMarker() {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    const handleCenter = () => {
      map.locate().on("locationfound", (e) => {
        setPosition([e.latlng.lat, e.latlng.lng]);
        map.flyTo(e.latlng, map.getZoom());
      });
    };

    window.addEventListener('center-map', handleCenter);
    return () => window.removeEventListener('center-map', handleCenter);
  }, [map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

function CollapsibleDeviceList({ 
  devices, 
  latestGPS, 
  onSelect 
}: { 
  devices: DeviceResponse[], 
  latestGPS: GPSDataResponse[],
  onSelect: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl rounded-t-2xl overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 flex items-center justify-between px-6 bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">Device Explorer ({devices.length})</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
      </button>
      
      {isOpen && (
        <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-800 p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {devices.map(dev => {
            const gps = latestGPS.find(g => g.device_id === dev.device_id);
            return (
              <button
                key={dev.device_id}
                onClick={() => onSelect(dev.device_id)}
                className="flex items-center gap-3 p-3 bg-slate-950/50 hover:bg-slate-800 rounded-xl transition-all border border-slate-800/50 group"
              >
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  dev.is_active ? "bg-green-500 animate-pulse" : "bg-slate-700"
                )} />
                <div className="text-left flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate group-hover:text-blue-400 transition-colors">{dev.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Navigation className="w-2 h-2" />
                    {gps ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}` : 'No data'}
                  </div>
                </div>
                {gps && (
                  <div className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                    {gps.speed} <span className="text-[8px] opacity-60">KM/H</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// --- Main Component ---

export default function MapPage() {
  const { get, loading } = useApi();
  const [searchParams] = useSearchParams();
  const targetDeviceId = searchParams.get('device');

  const [devices, setDevices] = useState<DeviceResponse[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [timeRange, setRange] = useState<string>('24');
  const [liveData, setLiveData] = useState<GPSDataResponse[]>([]);
  const [liveTrails, setLiveTrails] = useState<Record<string, [number, number][]>>({});
  const [trailData, setTrailData] = useState<GPSDataResponse[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<[number, number, number][]>([]);
  const [mapType, setMapType] = useState<'street' | 'dark' | 'sat'>('dark');

  // Geofence Monitoring
  const geofenceDevices = useMemo(() => liveData.map(gps => ({
    device_id: gps.device_id,
    name: devices.find(d => d.device_id === gps.device_id)?.name || gps.device_id,
    history: [gps] as any[]
  })), [liveData, devices]);
  
  const { geofences } = useGeofenceMonitoring(geofenceDevices);

  const fetchDevices = useCallback(async () => {
    try {
      const data = await get('/api/devices');
      setDevices(data);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  }, [get]);

  const fetchLive = useCallback(async () => {
    try {
      const data = await get('/api/gps/latest?limit=500');
      
      const filtered = filterDevice === 'all' 
        ? data 
        : data.filter((d: GPSDataResponse) => d.device_id === filterDevice);
      
      setLiveData(filtered);

      // Update Live Trails
      setLiveTrails(prev => {
        const next = { ...prev };
        data.forEach((gps: GPSDataResponse) => {
          const points = next[gps.device_id] || [];
          const lastPoint = points[points.length - 1];
          if (!lastPoint || lastPoint[0] !== gps.latitude || lastPoint[1] !== gps.longitude) {
            const newPoints = [...points, [gps.latitude, gps.longitude] as [number, number]];
            next[gps.device_id] = newPoints.slice(-20); // Keep last 20
          }
        });
        return next;
      });

    } catch (err) {
      console.error('Failed to fetch live data:', err);
    }
  }, [get, filterDevice]);

  const fetchTrailOrHeat = useCallback(async () => {
    if (viewMode === 'live') return;
    
    try {
      let data: GPSDataResponse[] = [];
      if (filterDevice === 'all') {
        const result = await get(`/api/gps/latest?limit=1000`);
        data = result;
      } else {
        const result = await get(`/api/gps/device/${filterDevice}?hours=${timeRange}`);
        data = result.records;
      }

      if (viewMode === 'trail') {
        setTrailData(data);
      } else if (viewMode === 'heatmap') {
        setHeatmapPoints(data.map(p => [p.latitude, p.longitude, 0.5]));
      }
    } catch (err) {
      console.error('Failed to fetch trail/heatmap data:', err);
    }
  }, [get, filterDevice, timeRange, viewMode]);

  useEffect(() => {
    fetchDevices();
    if (targetDeviceId) setFilterDevice(targetDeviceId);
  }, [fetchDevices, targetDeviceId]);

  useEffect(() => {
    if (viewMode === 'live') {
      fetchLive();
      const interval = setInterval(fetchLive, 10000);
      return () => clearInterval(interval);
    }
  }, [viewMode, fetchLive]);

  useEffect(() => {
    if (viewMode !== 'live') {
      fetchTrailOrHeat();
    } else {
      setTrailData([]);
      setHeatmapPoints([]);
    }
  }, [viewMode, filterDevice, timeRange, fetchTrailOrHeat]);

  const toggleFullscreen = () => {
    const el = document.getElementById('map-container');
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const getTileUrl = () => {
    switch (mapType) {
      case 'dark': return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'sat': return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      default: return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  return (
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col relative">
      <Card className="p-4 bg-slate-800 border-slate-700 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm relative z-20 overflow-visible">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white mr-2">Live Map</h1>
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700">
              {(['live', 'trail', 'heatmap'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    viewMode === mode 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300 rounded-xl">
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                <SelectItem value="all">All Devices</SelectItem>
                {devices.map(d => (
                  <SelectItem key={d.device_id} value={d.device_id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {viewMode !== 'live' && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <Select value={timeRange} onValueChange={setRange}>
                <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700 text-slate-300 rounded-xl">
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                  <SelectItem value="1">Last 1h</SelectItem>
                  <SelectItem value="6">Last 6h</SelectItem>
                  <SelectItem value="24">Last 24h</SelectItem>
                  <SelectItem value="168">Last 7d</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => viewMode === 'live' ? fetchLive() : fetchTrailOrHeat()}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <div className="h-6 w-[1px] bg-slate-700 mx-2" />
          <Button 
            variant={mapType === 'sat' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setMapType(mapType === 'sat' ? 'dark' : 'sat')}
            className={cn(
              "rounded-xl",
              mapType === 'sat' ? "bg-blue-600 hover:bg-blue-700" : "border-slate-700 text-slate-400"
            )}
          >
            <Layers className="w-4 h-4 mr-2" />
            Satellite
          </Button>
        </div>
      </Card>

      <div id="map-container" className="flex-1 relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 group z-10">
        <MapContainer
          center={[0, 0]}
          zoom={2}
          className="h-full w-full transition-all duration-700"
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <ZoomControl position="topright" />
          <MapAutoFit markers={liveData} points={trailData} filterDevice={filterDevice} viewMode={viewMode} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={getTileUrl()}
          />

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

          {viewMode === 'live' && (
            <>
              <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
                {liveData.map((gps) => (
                  <Marker
                    key={gps.id}
                    position={[gps.latitude, gps.longitude]}
                    icon={L.divIcon({
                      className: 'live-marker',
                      html: `
                        <div class="relative flex items-center justify-center">
                          <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-25"></div>
                          <div class="relative w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></div>
                        </div>
                      `,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12]
                    })}
                  >
                    <Popup>
                      <div className="p-2 min-w-[150px]">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span className="font-bold text-sm">{gps.device_id}</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between"><span>Speed</span><span className="font-bold text-blue-600">{gps.speed} km/h</span></div>
                          <div className="flex justify-between"><span>Coords</span><span className="font-mono">{gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}</span></div>
                          <div className="pt-2 text-[10px] text-slate-400 italic">
                            Last {(() => {
                              const ts = gps.timestamp.endsWith('Z') ? gps.timestamp : `${gps.timestamp}Z`;
                              return formatDistanceToNow(new Date(ts));
                            })()} ago
                          </div>
                        </div>
                        <Button variant="link" size="sm" className="w-full mt-2 text-blue-500 h-6 p-0" onClick={() => { setFilterDevice(gps.device_id); setViewMode('trail'); }}>View History →</Button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
              
              {/* Live trails */}
              {(Object.entries(liveTrails) as [string, [number, number][]][]).map(([devId, points]) => (
                points.length > 1 && (
                  <Polyline
                    key={`trail-${devId}`}
                    positions={points}
                    color="#3b82f6"
                    weight={2}
                    opacity={0.4}
                    dashArray="5, 5"
                  />
                )
              ))}
            </>
          )}

          {viewMode === 'trail' && trailData.length > 0 && (
            <>
              <Polyline
                positions={trailData.map(p => [p.latitude, p.longitude]) as [number, number][]}
                color="#3b82f6"
                weight={4}
                opacity={0.8}
                dashArray="10, 10"
              />
              <Marker position={[trailData[0].latitude, trailData[0].longitude]} opacity={0.6}><Popup>Start Point</Popup></Marker>
              <Marker position={[trailData[trailData.length-1].latitude, trailData[trailData.length-1].longitude]}><Popup>Current/End Point</Popup></Marker>
            </>
          )}

          {viewMode === 'heatmap' && <HeatLayer points={heatmapPoints} />}
          <UserLocationMarker />
        </MapContainer>

        {/* HUD Elements */}
        <div className="absolute left-6 bottom-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
          <Button variant="secondary" size="icon" className="w-12 h-12 bg-slate-900/90 rounded-2xl shadow-2xl" onClick={toggleFullscreen}><Maximize className="w-5 h-5" /></Button>
          <Button variant="secondary" size="icon" className="w-12 h-12 bg-slate-900/90 rounded-2xl shadow-2xl" onClick={() => window.dispatchEvent(new Event('center-map'))}><Crosshair className="w-5 h-5" /></Button>
        </div>

        <div className="absolute right-6 bottom-6 z-[1000] pointer-events-none hidden md:block">
          <div className="px-5 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl flex items-center gap-6">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /><span className="text-[10px] font-bold text-slate-400 uppercase">Active Fleet</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-700" /><span className="text-[10px] font-bold text-slate-400 uppercase">Offline</span></div>
            <div className="h-4 w-[1px] bg-slate-800" /><div className="text-[10px] font-bold text-slate-400 uppercase">Nodes: {liveData.length}</div>
          </div>
        </div>

        {/* Bottom Drawer */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-4xl px-4 pointer-events-auto">
          <CollapsibleDeviceList devices={devices} latestGPS={liveData} onSelect={(id) => { setFilterDevice(id); setViewMode('live'); }} />
        </div>
      </div>
      
      <style>{`
        .leaflet-container { background-color: #020617 !important; }
        .leaflet-popup-content-wrapper { background-color: white !important; border-radius: 12px !important; padding: 0 !important; overflow: hidden; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip { background-color: white !important; }
      `}</style>
    </div>
  );
}

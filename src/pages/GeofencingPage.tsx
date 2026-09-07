/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { Button } from '../components/ui/button';
import { 
  LogOut, 
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Undo2,
  Trash2,
  MousePointer2,
  Maximize2,
  RefreshCw,
  Plus,
  Sparkles,
  Crosshair,
  HelpCircle,
  Info,
  Target,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker, Popup, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { DeviceResponse, GPSDataResponse } from '../types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function GeofencingPage() {
  const { get, post } = useApi();
  const navigate = useNavigate();
  
  // Geofence states
  const [selectedZone, setSelectedZone] = useState<'grazing' | 'neighbor' | 'outside'>('grazing');
  const [zones, setZones] = useState<Record<'grazing' | 'neighbor' | 'outside', [number, number][]>>({
    grazing: [],
    neighbor: [],
    outside: []
  });

  const [mapType, setMapType] = useState<'street' | 'sat'>('sat');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const [devices, setDevices] = useState<DeviceResponse[]>([]);
  const [latestGPS, setLatestGPS] = useState<GPSDataResponse[]>([]);
  const [selectedDeviceRef, setSelectedDeviceRef] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null);

  const fetchDevicesAndGps = useCallback(async () => {
    try {
      const [devicesData, gpsData] = await Promise.all([
        get('/api/devices'),
        get('/api/gps/latest?limit=500')
      ]);
      setDevices(devicesData || []);
      setLatestGPS(gpsData || []);
    } catch (err) {
      console.error('Failed to fetch devices or GPS reference points', err);
    }
  }, [get]);

  const generateCircleZone = (lat: number, lng: number) => {
    const radiusInDegrees = 0.0015;
    const points: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const offsetLat = Math.sin(angle) * radiusInDegrees;
      const offsetLng = Math.cos(angle) * radiusInDegrees * 1.25;
      points.push([lat + offsetLat, lng + offsetLng]);
    }
    setZones(prev => ({
      ...prev,
      [selectedZone]: points
    }));
    toast.success(`Generated boundary around reference point`);
  };

  useEffect(() => {
    fetchDevicesAndGps();
    const interval = setInterval(fetchDevicesAndGps, 15000);
    return () => clearInterval(interval);
  }, [fetchDevicesAndGps]);

  const fetchGeofences = useCallback(async () => {
    try {
      const data = await get('/api/settings/geofences');
      if (data && data.zones) {
        setZones({
          grazing: data.zones.grazing?.coordinates || [],
          neighbor: data.zones.neighbor?.coordinates || [],
          outside: data.zones.outside?.coordinates || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch geofences', err);
    }
  }, [get]);

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  const handleClearGeofence = (zone: 'grazing' | 'neighbor' | 'outside') => {
    setZones(prev => ({ ...prev, [zone]: [] }));
    toast.info(`Cleared ${zone} boundary`);
  };

  const handleUndoPoint = (zone: 'grazing' | 'neighbor' | 'outside') => {
    setZones(prev => ({
      ...prev,
      [zone]: prev[zone].slice(0, -1)
    }));
  };

  const getTileUrl = () => {
    switch (mapType) {
      case 'sat': return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      default: return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const handleSaveGeofences = async () => {
    try {
      const payload = {
        zones: {
          grazing: { id: 'grazing', name: 'Grazing Zone', color: '#22c55e', coordinates: zones.grazing },
          neighbor: { id: 'neighbor', name: 'Neighbor Buffer', color: '#f59e0b', coordinates: zones.neighbor },
          outside: { id: 'outside', name: 'Restricted Area', color: '#ef4444', coordinates: zones.outside }
        }
      };
      await post('/api/settings/geofences', payload);
      toast.success('Geofencing boundaries saved successfully');
    } catch (err) {
      toast.error('Failed to save geofences');
    }
  };

  function MapFocusController({ position }: { position: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
      if (position) {
        map.flyTo(position, 16, { animate: true, duration: 1.5 });
      }
    }, [position, map]);
    return null;
  }

  function MapLocator() {
    const map = useMap();
    const locate = () => {
      map.locate({ setView: false }).on("locationfound", (e) => {
        setUserLocation([e.latlng.lat, e.latlng.lng]);
        map.flyTo(e.latlng, 18, { animate: true, duration: 1.5 });
      });
    };

    return (
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={locate}
          className="bg-white text-slate-900 border-slate-200 hover:bg-slate-100 shadow-2xl rounded-xl w-12 h-12 p-0 border-2"
          title="Zoom to my location"
        >
          <MapPin className="w-6 h-6 text-blue-600" />
        </Button>
      </div>
    );
  }

  function GeofenceMapEvents() {
    useMapEvents({
      click(e) {
        setZones(prev => ({
          ...prev,
          [selectedZone]: [...prev[selectedZone], [e.latlng.lat, e.latlng.lng]]
        }));
      },
    });
    return null;
  }

  return (
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-slate-950 -m-4 md:-m-8">
      {/* Control Panel */}
      <div className="w-full md:w-[400px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 shadow-2xl overflow-y-auto no-scrollbar">
        <div className="p-8 space-y-8">
          <header>
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 px-3 py-1 border-none rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Editor
              </Badge>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')} className="text-slate-400 hover:text-white">
                  <Bell className="w-4 h-4 mr-2" /> Alerts
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="text-slate-400 hover:text-white">
                  <LogOut className="w-4 h-4 mr-2 rotate-180" /> Settings
                </Button>
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white leading-tight">Geofence Architect</h1>
            <p className="text-slate-400 mt-3 text-sm leading-relaxed">
              Define interactive boundaries for your livestock. Select a zone and click on the satellite map to place vertices.
            </p>
          </header>

          <div className="space-y-4">
            <h2 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-500">Perimeter Layers</h2>
            {[
              { id: 'grazing', name: 'Safe Zone', color: 'bg-green-500', desc: 'Authorized grazing pasture' },
              { id: 'neighbor', name: 'Buffer Zone', color: 'bg-amber-500', desc: 'Alert if entry occurs' },
              { id: 'outside', name: 'Alert Zone', color: 'bg-red-500', desc: 'Critical restricted area' }
            ].map(zone => (
              <div
                key={zone.id}
                onClick={() => setSelectedZone(zone.id as any)}
                className={cn(
                  "group p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer relative overflow-hidden",
                  selectedZone === zone.id 
                    ? "bg-slate-800 border-slate-600 shadow-2xl ring-2 ring-blue-500/20 translate-x-2" 
                    : "bg-slate-950/40 border-slate-800 hover:bg-slate-800/40"
                )}
              >
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-4 h-4 rounded-full shadow-lg", zone.color)} />
                      <span className="font-bold text-white group-hover:tracking-wide transition-all">{zone.name}</span>
                    </div>
                    <Badge variant="outline" className="bg-slate-900/50 border-slate-700 text-[10px] py-0.5 px-2 rounded-lg">
                      {zones[zone.id as keyof typeof zones].length} Points
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed translate-y-0 group-hover:translate-x-1 transition-transform">
                    {zone.desc}
                  </p>
                  
                  {selectedZone === zone.id && (
                    <div className="flex gap-2 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 rounded-xl h-10 text-[10px] font-bold bg-slate-900 hover:bg-slate-950 text-slate-300"
                        onClick={(e) => { e.stopPropagation(); handleUndoPoint(zone.id as any); }}
                        disabled={zones[zone.id as keyof typeof zones].length === 0}
                      >
                        <Undo2 className="w-3 h-3 mr-2" /> Undo
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 rounded-xl h-10 text-[10px] font-bold bg-slate-900 hover:bg-red-950/30 text-red-400 hover:text-red-300"
                        onClick={(e) => { e.stopPropagation(); handleClearGeofence(zone.id as any); }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" /> Clear
                      </Button>
                    </div>
                  )}
                </div>
                {selectedZone === zone.id && (
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <MousePointer2 className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Interactive Guidelines */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-[2rem] space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-slate-200">Interactive Drawing Tips</h3>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Click anywhere on the map to add boundary points.</li>
              <li>Drag numbered handles on the map to move vertices.</li>
              <li>Click on any handle to remove that specific vertex.</li>
              <li>Select a collar below to use its position as a reference.</li>
            </ul>
          </div>

          {/* Device Reference Center */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-500">Device Reference Point</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchDevicesAndGps} 
                className="h-6 w-6 p-0 text-slate-500 hover:text-white"
                title="Refresh locations"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>

            {devices.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-[2rem] text-center">
                <p className="text-xs text-slate-500">No active tracking collars detected.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Select 
                  value={selectedDeviceRef || ''} 
                  onValueChange={(val) => {
                    setSelectedDeviceRef(val);
                    const gps = latestGPS.find(g => g.device_id === val);
                    if (gps) {
                      setFlyToTarget([gps.latitude, gps.longitude]);
                      toast.success(`Selected reference: ${devices.find(d => d.device_id === val)?.name || val}`);
                    } else {
                      toast.error("No current GPS signal for this collar");
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-12 rounded-2xl bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-900 transition-colors">
                    <SelectValue placeholder="Select reference collar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    {devices.map(dev => {
                      const hasSignal = latestGPS.some(g => g.device_id === dev.device_id);
                      return (
                        <SelectItem key={dev.device_id} value={dev.device_id} className="focus:bg-slate-800 focus:text-white rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full", hasSignal ? "bg-green-500 animate-pulse" : "bg-slate-600")} />
                            <span>{dev.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedDeviceRef && (() => {
                  const gps = latestGPS.find(g => g.device_id === selectedDeviceRef);
                  const dev = devices.find(d => d.device_id === selectedDeviceRef);
                  if (!gps || !dev) return null;
                  return (
                    <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-[2rem] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                        <span className="text-[11px] text-slate-400 font-medium">GPS Signal</span>
                        <span className="text-[10px] text-blue-400 font-mono font-bold">{gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded-xl h-9 flex items-center justify-center gap-1.5 transition-colors"
                          onClick={() => {
                            setFlyToTarget([gps.latitude, gps.longitude]);
                            setTimeout(() => setFlyToTarget(null), 150);
                          }}
                        >
                          <Crosshair className="w-3.5 h-3.5 text-blue-400" /> Fly to Collar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded-xl h-9 flex items-center justify-center gap-1.5 transition-colors"
                          onClick={() => {
                            setZones(prev => ({
                              ...prev,
                              [selectedZone]: [...prev[selectedZone], [gps.latitude, gps.longitude]]
                            }));
                            toast.success(`Added reference point vertex to ${selectedZone === 'grazing' ? 'Safe Zone' : selectedZone === 'neighbor' ? 'Buffer Zone' : 'Alert Zone'}`);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5 text-green-400" /> Use as Vertex
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 text-[10px] font-black uppercase tracking-wider rounded-xl h-10 flex items-center justify-center gap-2 transition-all"
                        onClick={() => generateCircleZone(gps.latitude, gps.longitude)}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Draw 150m Safe Area
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

        </div>

        <div className="mt-auto p-8 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
          <Button 
            onClick={handleSaveGeofences} 
            className="w-full bg-green-600 hover:bg-green-700 h-16 rounded-2xl font-black text-lg shadow-2xl shadow-green-500/20 group"
          >
            Deploy Boundaries <CheckCircle2 className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Map Surface */}
      <div className="flex-1 relative bg-slate-950">
        <div className="absolute top-6 right-6 z-[1000] flex flex-col md:flex-row gap-2">
          <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex shadow-2xl backdrop-blur-xl">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMapType('street')}
              className={cn(
                "rounded-xl h-10 px-4 font-bold text-xs",
                mapType === 'street' ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-white"
              )}
            >
              Terrain
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMapType('sat')}
              className={cn(
                "rounded-xl h-10 px-4 font-bold text-xs flex items-center gap-2",
                mapType === 'sat' ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-white"
              )}
            >
              <Globe className="w-3 h-3" /> Satellite
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            className="bg-slate-900 border-slate-800 text-white rounded-2xl h-12 shadow-2xl backdrop-blur-xl flex items-center gap-2 px-6 hover:bg-slate-800 border-2"
            onClick={() => window.location.reload()}
          >
            <Maximize2 className="w-4 h-4" /> Reset View
          </Button>
        </div>

        <MapContainer 
          center={[6.5244, 3.3792] as [number, number]} 
          zoom={14} 
          style={{ height: '100%', width: '100%' }}
          className="z-10 focus:outline-none"
          zoomControl={false}
        >
          <TileLayer url={getTileUrl()} />
          <GeofenceMapEvents />
          <MapLocator />
          
          {flyToTarget && (
            <MapFocusController position={flyToTarget} />
          )}

          {userLocation && (
            <Marker position={userLocation} icon={L.divIcon({
              className: 'user-location-marker',
              html: `<div class="relative flex items-center justify-center">
                      <div class="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-40"></div>
                      <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
                    </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })}>
              <Popup className="text-slate-900 font-bold">Your Command Location</Popup>
            </Marker>
          )}

          {/* Draggable Active Zone Vertices */}
          {zones[selectedZone]?.map((coord, index) => (
            <Marker
              key={`${selectedZone}-vertex-${index}-${coord[0]}-${coord[1]}`}
              position={coord}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  setZones(prev => {
                    const updated = [...prev[selectedZone]];
                    updated[index] = [position.lat, position.lng];
                    return { ...prev, [selectedZone]: updated };
                  });
                },
                click: () => {
                  setZones(prev => {
                    const updated = [...prev[selectedZone]];
                    updated.splice(index, 1);
                    return { ...prev, [selectedZone]: updated };
                  });
                  toast.info(`Removed vertex ${index + 1}`);
                }
              }}
              icon={L.divIcon({
                className: 'vertex-marker',
                html: `<div class="relative flex items-center justify-center cursor-move">
                        <div class="absolute w-7 h-7 bg-blue-500/20 rounded-full animate-pulse"></div>
                        <div class="relative w-5 h-5 bg-blue-600 border border-white rounded-full shadow-lg flex items-center justify-center text-[10px] font-black text-white hover:scale-125 transition-transform">
                          ${index + 1}
                        </div>
                      </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
            />
          ))}

          {/* Live Device reference coordinates */}
          {latestGPS.map(gps => {
            const dev = devices.find(d => d.device_id === gps.device_id);
            const isSelected = selectedDeviceRef === gps.device_id;
            return (
              <Marker
                key={`ref-device-${gps.device_id}`}
                position={[gps.latitude, gps.longitude]}
                icon={L.divIcon({
                  className: 'ref-device-marker',
                  html: `<div class="relative flex items-center justify-center cursor-pointer">
                          <div class="absolute w-12 h-12 ${isSelected ? 'bg-blue-500/20 animate-ping' : 'bg-green-500/10'} rounded-full"></div>
                          <div class="relative flex items-center justify-center w-8 h-8 ${isSelected ? 'bg-blue-600 text-white ring-4 ring-blue-500/30' : 'bg-slate-900 text-slate-200 border-2 border-slate-700'} rounded-full shadow-2xl transition-all">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </div>
                        </div>`,
                  iconSize: [48, 48],
                  iconAnchor: [24, 24]
                })}
              >
                <Popup>
                  <div className="p-2 font-sans text-slate-900 max-w-[200px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <h4 className="font-bold text-sm text-slate-950 truncate">{dev?.name || gps.device_id}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mb-3">Live Collar Reference</p>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] font-black uppercase tracking-wider text-green-600 hover:bg-green-50 border border-green-200 rounded-lg justify-start gap-1"
                        onClick={() => {
                          setZones(prev => ({
                            ...prev,
                            [selectedZone]: [...prev[selectedZone], [gps.latitude, gps.longitude]]
                          }));
                          toast.success(`Added reference point to ${selectedZone}`);
                        }}
                      >
                        <Plus className="w-3 h-3" /> Add As Vertex
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] font-black uppercase tracking-wider text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg justify-start gap-1"
                        onClick={() => generateCircleZone(gps.latitude, gps.longitude)}
                      >
                        <Sparkles className="w-3 h-3" /> Draw 150m Area
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {zones.grazing.length > 0 && <Polygon positions={zones.grazing} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.3 }}><Tooltip sticky>Grazing Space</Tooltip></Polygon>}
          {zones.neighbor.length > 0 && <Polygon positions={zones.neighbor} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.2 }}><Tooltip sticky>Shared Buffer</Tooltip></Polygon>}
          {zones.outside.length > 0 && <Polygon positions={zones.outside} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1 }}><Tooltip sticky>Forbidden Zone</Tooltip></Polygon>}
          
          <ZoomControl position="bottomright" />
        </MapContainer>
      </div>
    </div>
  );
}

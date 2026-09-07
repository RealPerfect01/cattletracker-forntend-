/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { GeofenceConfig, AlertRequest, DeviceWithHistory } from '../types';
import { getDeviceZone } from '../lib/geofenceUtils';
import { toast } from 'sonner';

export function useGeofenceMonitoring(devices: DeviceWithHistory[]) {
  const { get, post } = useApi();
  const [geofences, setGeofences] = useState<GeofenceConfig | null>(null);
  const lastKnownZones = useRef<Record<string, string>>({}); // device_id -> zone_id

  // Load geofences once
  useEffect(() => {
    const loadGeofences = async () => {
      try {
        const data = await get('/api/settings/geofences');
        if (data && data.zones) {
          setGeofences(data);
        }
      } catch (err) {
        console.error('Failed to load geofences for monitoring', err);
      }
    };
    loadGeofences();
  }, []);

  const sendAlert = useCallback(async (alert: AlertRequest) => {
    try {
      // Endpoint provided by user: POST /api/alerts
      await post('/api/alerts', alert);
      
      // Notify user in system
      toast.warning(`Geofence Alert: ${alert.device_name} entered ${alert.zone}`, {
        description: `Coordinates: ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`,
        duration: 5000,
      });
    } catch (err) {
      console.error('Failed to send alert to backend', err);
    }
  }, [post]);

  // Monitor devices
  useEffect(() => {
    if (!geofences || !devices.length) return;

    devices.forEach(device => {
      if (!device.history || device.history.length === 0) return;

      const lastPos = device.history[0];
      const point: [number, number] = [lastPos.latitude, lastPos.longitude];
      
      const zoneConfig = {
        grazing: geofences.zones.grazing.coordinates,
        neighbor: geofences.zones.neighbor.coordinates,
        outside: geofences.zones.outside.coordinates
      };

      const currentZone = getDeviceZone(point, zoneConfig);
      const previousZoneId = lastKnownZones.current[device.device_id];

      // If zone changed, trigger alert
      if (previousZoneId !== undefined && previousZoneId !== currentZone.id) {
        // We only alert if moving to a "worse" or "different" zone
        // For cattle, any change of zone is important
        sendAlert({
          device_id: device.device_id,
          device_name: device.name,
          zone: currentZone.name,
          timestamp: new Date().toISOString(),
          latitude: lastPos.latitude,
          longitude: lastPos.longitude
        });
      }

      // Update state
      lastKnownZones.current[device.device_id] = currentZone.id;
    });
  }, [devices, geofences, sendAlert]);

  return { geofences };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GPSDataResponse {
  id: number;
  device_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  // True when this point came from the device's cached last-known fix
  // rather than a live GPS reading (e.g. right after reboot).
  stale: boolean;
  // True when this point was sent late from the device's offline buffer
  // rather than in real time.
  buffered: boolean;
  timestamp: string;
}

export interface DeviceResponse {
  id: number;
  device_id: string;
  name: string;
  created_at: string;
  last_seen: string | null;
  is_active: boolean;
  record_count?: number;
}

export interface DeviceUpdate {
  name?: string;
  is_active?: boolean;
}

export interface GeofenceZone {
  id: string;
  name: string;
  color: string;
  coordinates: [number, number][]; // [lat, lng]
}

export interface GeofenceConfig {
  zones: {
    grazing: GeofenceZone;
    neighbor: GeofenceZone;
    outside: GeofenceZone;
  };
}

export interface AlertRequest {
  device_id: string;
  device_name: string;
  zone: string;
  timestamp: string;
  latitude: number;
  longitude: number;
}

export interface AlertResponse {
  id: number;
  device_id: string;
  device_name: string | null;
  zone: string;
  alert_type: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  is_read: boolean;
}

export interface AlertListResponse {
  alerts: AlertResponse[];
  total: number;
  unread_count: number;
}

export interface DashboardStats {
  total_devices: number;
  total_records: number;
  active_devices: number;
  latest_records: GPSDataResponse[];
}

export interface DeviceHistoryResponse {
  device_id: string;
  device_name: string;
  record_count: number;
  records: GPSDataResponse[];
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  id: number;
  username: string;
  email?: string;
}

export interface DeviceWithHistory {
  device_id: string;
  name: string;
  history: GPSDataResponse[];
}

export interface CommandCreate {
  command_type?: string;
  file?: string | null;
  volume?: number | null;
}

export interface CommandResponse {
  id: number;
  device_id: string;
  command_type: string;
  file: string | null;
  volume: number | null;
  created_at: string;
  delivered: boolean;
}


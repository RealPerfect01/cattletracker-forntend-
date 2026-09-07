/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { AuthGuard } from './AuthGuard';
import { Layout } from './components/Layout';
import { Toaster } from './components/ui/sonner';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import DevicesPage from './pages/DevicesPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import SettingsPage from './pages/SettingsPage';
import GeofencingPage from './pages/GeofencingPage';
import AlertsPage from './pages/AlertsPage';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Layout>
                  <DashboardPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/map"
            element={
              <AuthGuard>
                <Layout>
                  <MapPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/devices"
            element={
              <AuthGuard>
                <Layout>
                  <DevicesPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/devices/:deviceId"
            element={
              <AuthGuard>
                <Layout>
                  <DeviceDetailPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Layout>
                  <SettingsPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/geofencing"
            element={
              <AuthGuard>
                <Layout>
                  <GeofencingPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/alerts"
            element={
              <AuthGuard>
                <Layout>
                  <AlertsPage />
                </Layout>
              </AuthGuard>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </Router>
  );
}

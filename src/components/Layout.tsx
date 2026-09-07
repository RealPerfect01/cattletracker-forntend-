/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import {
  LayoutDashboard,
  Map as MapIcon,
  Cpu,
  Settings,
  LogOut,
  Menu,
  X,
  MapPin,
  ChevronRight,
  User,
  Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from '@radix-ui/react-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { get } = useApi();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  const fetchUnreadAlerts = useCallback(async () => {
    try {
      const data = await get('/api/alerts?limit=1&unread_only=true');
      setUnreadAlerts(data.unread_count || 0);
    } catch (err) {
      // silent — sidebar badge is best-effort
    }
  }, [get]);

  useEffect(() => {
    fetchUnreadAlerts();
    const interval = setInterval(fetchUnreadAlerts, 20000);
    return () => clearInterval(interval);
  }, [fetchUnreadAlerts]);

  const navItems: { name: string; path: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Map', path: '/map', icon: MapIcon },
    { name: 'Devices', path: '/devices', icon: Cpu },
    { name: 'Geofencing', path: '/geofencing', icon: MapPin },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: unreadAlerts },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex overflow-hidden">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[260px] bg-slate-800 border-r border-slate-700 flex flex-col transition-transform duration-300 md:translate-x-0 md:static",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Brand */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-700">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Cattle<span className="text-green-500">Track</span></span>
          <button 
            className="ml-auto md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative",
                isActive 
                  ? "bg-slate-700 text-blue-500 border-l-4 border-blue-500 rounded-l-none" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-5 h-5", isActive ? "text-blue-500" : "text-slate-500 group-hover:text-slate-300")} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge ? (
                    <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer / User */}
        <div className="p-6 border-t border-slate-700 mt-auto bg-slate-800/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-sm font-bold text-slate-300">
              {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.username || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">System Control</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2 px-4 bg-slate-700 hover:bg-red-500 hover:text-white text-slate-400 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="h-16 border-b border-slate-800 flex items-center px-4 md:hidden bg-slate-900 absolute top-0 left-0 right-0 z-30">
          <button 
            className="p-2 text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 font-bold">CattleTrack</span>
        </header>

        {/* Scrollable Content */}
        <main className={cn(
          "flex-1 overflow-y-auto w-full max-w-[1440px] mx-auto",
          "md:p-8 p-4 pt-20 md:pt-8"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};

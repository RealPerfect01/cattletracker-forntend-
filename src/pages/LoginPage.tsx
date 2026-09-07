/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { MapPin, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://trackersystem-fda5.onrender.com';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Invalid username or password' }));
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      if (data.access_token) {
        login(data.access_token, { id: 0, username: username });
        toast.success('Welcome back, admin!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Brand Panel (Left on Desktop) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-gradient-to-br from-green-600 via-green-700 to-slate-900 items-center justify-center p-12 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="inline-block p-4 bg-white/10 backdrop-blur-xl rounded-3xl mb-8 border border-white/20 shadow-2xl"
          >
            <MapPin className="w-20 h-20 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tighter"
          >
            Cattle GPS Tracker System
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-green-100 text-xl max-w-md mx-auto leading-relaxed"
          >
            Advanced livestock monitoring and real-time herd tracking for modern farming.
          </motion.p>
        </div>
      </div>

      {/* Login Card (Right/Center) */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-12 bg-slate-900 relative">
        {/* Mobile decorative overlay */}
        <div className="md:hidden absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Logo for mobile/top */}
          <div className="flex items-center gap-3 mb-8 md:mb-12 justify-center">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">CattleTrack</span>
          </div>

          <Card className="bg-slate-800 border-slate-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
            <div className="p-8 pb-4">
              <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
              <p className="text-slate-400 text-sm">Sign in to your admin dashboard</p>
            </div>

            <CardContent className="p-8 pt-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-300 ml-1">Username</Label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-900 border-slate-600 pl-11 h-12 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300 ml-1">Password</Label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-900 border-slate-600 pl-11 pr-11 h-12 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 h-12 rounded-lg text-white font-semibold text-base shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : 'Sign In'}
                </Button>
              </form>
            </CardContent>

            <div className="p-8 pt-0 text-center">
              <div className="inline-block p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Demo Access</p>
                <code className="text-xs text-blue-400 font-mono">admin / admin123</code>
              </div>
            </div>
          </Card>

          <footer className="mt-8 text-center">
            <p className="text-slate-500 text-xs">Cattle GPS Tracking System v1.1.0 • Secured with JWT</p>
          </footer>
        </motion.div>
      </div>
    </div>
  );
}

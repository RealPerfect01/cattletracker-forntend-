/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MapPin, Radio, Monitor, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-green-500/30 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/50 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-500 p-1.5 rounded-lg">
              <MapPin className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Cattle<span className="text-green-500">Track</span></span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button onClick={() => navigate('/dashboard')} className="bg-green-500 hover:bg-green-600">Dashboard</Button>
            ) : (
              <Button onClick={() => navigate('/login')} className="bg-green-500 hover:bg-green-600">Login</Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center text-center overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl relative z-10"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight mb-8 text-white">
            Cattle GPS Tracker System
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            A professional livestock monitoring system designed for real-time herd visibility. Track position, grazing habits, and movement history with precision.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="bg-green-500 hover:bg-green-600 h-14 px-10 text-lg rounded-lg transition-transform active:scale-95">
                Start Monitoring <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: <Radio className="w-8 h-8" />, 
                title: "Herd Management", 
                desc: "Live updates of your entire herd. Monitor animal movement every 5 seconds on high-fidelity topographic maps." 
              },
              { 
                icon: <Monitor className="w-8 h-8" />, 
                title: "Scalable Deployment", 
                desc: "Monitor thousands of cattle from a single interface. Group devices by herd, paddock, or ranch location." 
              },
              { 
                icon: <Shield className="w-8 h-8" />, 
                title: "Geofencing Alerts", 
                desc: "Instant notifications if livestock drifts outside of designated grazing zones or safe perimeters." 
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-xl bg-slate-800 border border-slate-700 hover:border-green-500/50 transition-all group"
              >
                <div className="text-green-500 mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">© 2026 Cattle GPS Tracker System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

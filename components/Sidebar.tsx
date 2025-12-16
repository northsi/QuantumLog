import React from 'react';
import { Calendar, CheckSquare, Book, FlaskConical, Atom } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Atom size={20} /> },
    { id: 'calendar', label: 'Schedule', icon: <Calendar size={20} /> },
    { id: 'daily', label: 'Daily Plan', icon: <CheckSquare size={20} /> },
    { id: 'projects', label: 'Research Projects', icon: <FlaskConical size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0 shadow-xl z-20">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Atom className="text-cyan-400" />
          QuantumLog
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              currentView === item.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-2">System Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-mono text-emerald-400">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};
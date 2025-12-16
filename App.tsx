import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './views/CalendarView';
import { DailyView } from './views/DailyView';
import { ProjectView } from './views/ProjectView';
import { AppState, Project, NotebookEntry, CalendarEvent } from './types';
import { loadState, saveState } from './services/storageService';
import { Atom, Download, Upload, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [data, setData] = useState<AppState>({
    projects: [],
    entries: [],
    todos: [],
    events: []
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial state (Async now due to IndexedDB)
  useEffect(() => {
    const initData = async () => {
      try {
        const loaded = await loadState();
        if (loaded) setData(loaded);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoaded(true);
      }
    };
    initData();
  }, []);

  // Save on change, but only after initial load is complete
  useEffect(() => {
    if (isLoaded) {
      saveState(data);
    }
  }, [data, isLoaded]);

  const addProject = (title: string, desc: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      title,
      description: desc,
      createdAt: Date.now()
    };
    setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
  };

  const addEntry = (entry: NotebookEntry) => {
    setData(prev => ({ ...prev, entries: [...prev.entries, entry] }));
  };

  const updateEntry = (updatedEntry: NotebookEntry) => {
    setData(prev => ({
      ...prev,
      entries: prev.entries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
    }));
  };

  const deleteProject = (id: string) => {
    if (window.confirm("Are you sure? This will delete all entries for this project.")) {
      setData(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== id),
        entries: prev.entries.filter(e => e.projectId !== id)
      }));
    }
  };

  const deleteEntry = (id: string) => {
    setData(prev => ({ ...prev, entries: prev.entries.filter(e => e.id !== id) }));
  };

  const addTodo = (text: string) => {
    const todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      date: new Date().toISOString().split('T')[0]
    };
    setData(prev => ({ ...prev, todos: [...prev.todos, todo] }));
  };

  const toggleTodo = (id: string) => {
    setData(prev => ({
      ...prev,
      todos: prev.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  const deleteTodo = (id: string) => {
    setData(prev => ({ ...prev, todos: prev.todos.filter(t => t.id !== id) }));
  };

  const updateTodoNote = (id: string, note: string) => {
    setData(prev => ({
      ...prev,
      todos: prev.todos.map(t => t.id === id ? { ...t, notes: note } : t)
    }));
  };

  const addEvent = (event: CalendarEvent) => {
    setData(prev => ({ ...prev, events: [...prev.events, event] }));
  };

  const deleteEvent = (id: string) => {
    setData(prev => ({ ...prev, events: prev.events.filter(e => e.id !== id) }));
  };

  // Backup Functions
  const handleExportData = () => {
    const dataStr = JSON.stringify(data);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quantum_log_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.projects && json.entries) {
          if (window.confirm("This will overwrite your current data with the backup. Continue?")) {
            setData(json);
            alert("Data imported successfully!");
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        const todayStr = new Date().toISOString().split('T')[0];
        const activeTaskCount = data.todos.filter(t => 
          !t.completed && t.date <= todayStr
        ).length;

        return (
          <div className="p-10 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Welcome Back, Researcher</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-slate-500 text-sm font-semibold uppercase mb-2">Projects Active</h3>
                <p className="text-4xl font-bold text-slate-800">{data.projects.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-slate-500 text-sm font-semibold uppercase mb-2">Tasks to Do</h3>
                <p className="text-4xl font-bold text-slate-800">
                  {activeTaskCount}
                </p>
                <p className="text-xs text-slate-400 mt-2">Includes accumulated tasks</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-slate-500 text-sm font-semibold uppercase mb-2">Upcoming Events</h3>
                <p className="text-4xl font-bold text-slate-800">
                  {data.events.filter(e => new Date(e.date) >= new Date()).length}
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl text-white relative overflow-hidden mb-8">
               <Atom className="absolute -right-10 -bottom-10 text-slate-700 opacity-50" size={200} />
               <h2 className="text-2xl font-bold mb-2">Condensed Matter Theory Log</h2>
               <p className="text-slate-300 max-w-lg mb-6">
                 "God made the bulk; surfaces were invented by the devil." - Wolfgang Pauli.
               </p>
               <button onClick={() => setView('projects')} className="bg-cyan-600 hover:bg-cyan-500 px-6 py-2 rounded-lg font-medium transition-colors relative z-10">
                 Go to Notebook
               </button>
            </div>

            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-slate-400"/> 
                Data Management
              </h3>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleExportData}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                  <Download size={18} /> Backup / Export Data
                </button>
                <button 
                  onClick={handleImportClick}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                  <Upload size={18} /> Restore / Import Data
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Your data is stored locally in your browser (IndexedDB). Regular backups are recommended.
              </p>
            </div>
          </div>
        );
      case 'calendar':
        return <div className="p-6 h-full"><CalendarView events={data.events} onAddEvent={addEvent} onDeleteEvent={deleteEvent} /></div>;
      case 'daily':
        return <div className="p-6 h-full"><DailyView todos={data.todos} onAddTodo={addTodo} onToggleTodo={toggleTodo} onDeleteTodo={deleteTodo} onUpdateNote={updateTodoNote} /></div>;
      case 'projects':
        return (
          <ProjectView 
            projects={data.projects} 
            entries={data.entries}
            onAddProject={addProject}
            onAddEntry={addEntry}
            onUpdateEntry={updateEntry}
            onDeleteProject={deleteProject}
            onDeleteEntry={deleteEntry}
          />
        );
      default:
        return <div>View not found</div>;
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-400">
        <div className="animate-pulse flex flex-col items-center">
          <Atom size={48} className="mb-4 text-cyan-600"/>
          <p>Loading QuantumLog Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar currentView={view} setView={setView} />
      <main className="flex-1 ml-64 h-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
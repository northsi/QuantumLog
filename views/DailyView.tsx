import React, { useState } from 'react';
import { TodoItem } from '../types';
import { Check, Trash2, Plus, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react';

interface DailyViewProps {
  todos: TodoItem[];
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}

export const DailyView: React.FC<DailyViewProps> = ({ todos, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateNote }) => {
  const [newTodo, setNewTodo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Accumulation Mode: Show today's tasks AND past incomplete tasks
  const visibleTodos = todos.filter(t => {
    const isToday = t.date === todayStr;
    const isPastIncomplete = t.date < todayStr && !t.completed;
    return isToday || isPastIncomplete;
  });

  // Sort: Overdue items first, then by date/id
  visibleTodos.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return 0; 
  });
  
  const handleAdd = () => {
    if (!newTodo.trim()) return;
    onAddTodo(newTodo);
    setNewTodo('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Daily Plan</h2>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-slate-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <span className="text-xs bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full font-medium">Accumulation Mode</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-3">
          <input
            type="text"
            className="flex-1 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-slate-700"
            placeholder="Add a new task for today..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleAdd}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={20} /> Add
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visibleTodos.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <p>No pending tasks. Great job!</p>
            </div>
          )}

          {visibleTodos.map(todo => {
            const isOverdue = todo.date < todayStr && !todo.completed;
            return (
              <div 
                key={todo.id} 
                className={`bg-white border rounded-lg transition-all ${
                  todo.completed ? 'border-slate-100 bg-slate-50 opacity-75' : 'border-slate-200 shadow-sm hover:border-cyan-300'
                }`}
              >
                <div className="flex items-center p-4 gap-4">
                  <button
                    onClick={() => onToggleTodo(todo.id)}
                    className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                      todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-cyan-500'
                    }`}
                  >
                    {todo.completed && <Check size={14} />}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      {isOverdue && (
                        <span className="flex w-fit items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          <CalendarClock size={10} /> Overdue {todo.date}
                        </span>
                      )}
                      <span className={`font-medium ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {todo.text}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setExpandedId(expandedId === todo.id ? null : todo.id)}
                      className="text-slate-400 hover:text-cyan-600 p-2 rounded-full hover:bg-slate-100"
                    >
                      {expandedId === todo.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <button 
                      onClick={() => onDeleteTodo(todo.id)}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {expandedId === todo.id && (
                  <div className="px-4 pb-4 pl-14">
                    <textarea
                      placeholder="Add remarks or sub-steps..."
                      className="w-full text-sm p-3 bg-yellow-50 border border-yellow-200 rounded text-slate-700 outline-none focus:border-yellow-400 min-h-[80px]"
                      value={todo.notes || ''}
                      onChange={(e) => onUpdateNote(todo.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
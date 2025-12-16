import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onAddEvent, onDeleteEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<CalendarEvent['type']>('OTHER');

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const handleAddEvent = () => {
    if (!selectedDate || !newEventTitle.trim()) return;
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      date: selectedDate,
      title: newEventTitle,
      type: newEventType,
    };
    onAddEvent(newEvent);
    setNewEventTitle('');
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const renderEventBadge = (type: string) => {
    switch (type) {
      case 'CONFERENCE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DEADLINE': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEETING': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft /></button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-semibold text-slate-500">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={`border rounded-lg p-2 relative cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-slate-100'
                } ${isToday ? 'bg-cyan-50' : 'bg-white'}`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-cyan-700' : 'text-slate-700'}`}>{day}</div>
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px]">
                  {dayEvents.map(ev => (
                    <div key={ev.id} className={`text-[10px] px-1 rounded truncate border ${renderEventBadge(ev.type)}`}>
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Select a date'}
        </h3>

        {selectedDate && (
          <>
             <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Add New Event</label>
              <input
                type="text"
                placeholder="Event description..."
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
              />
              <select
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value as CalendarEvent['type'])}
              >
                <option value="OTHER">General</option>
                <option value="CONFERENCE">Conference</option>
                <option value="DEADLINE">Deadline</option>
                <option value="MEETING">Meeting</option>
              </select>
              <button
                onClick={handleAddEvent}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg p-2 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Event
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
               <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Events</h4>
               {events.filter(e => e.date === selectedDate).length === 0 && (
                 <p className="text-sm text-slate-400 italic">No events scheduled.</p>
               )}
               {events.filter(e => e.date === selectedDate).map(ev => (
                 <div key={ev.id} className="group flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border mr-2 ${renderEventBadge(ev.type)}`}>
                        {ev.type}
                      </span>
                      <p className="text-sm text-slate-700 mt-1">{ev.title}</p>
                    </div>
                    <button 
                      onClick={() => onDeleteEvent(ev.id)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                 </div>
               ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
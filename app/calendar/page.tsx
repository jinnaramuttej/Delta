'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarDays, Plus, Briefcase, Scale, Landmark, User, Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

const FOUNDER_ID = '8bbb8137-7357-4e07-b154-6d0b8034532f';

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: 'Compliance' | 'Hiring' | 'Legal' | 'Manual';
};

// Static compliance events derived from finance metrics
const COMPLIANCE_DEADLINES = [
  { id: 'c1', title: 'TDS deposit (Jun)', date: new Date('2026-07-03'), type: 'Compliance' as const },
  { id: 'c2', title: 'GSTR-3B filing', date: new Date('2026-07-09'), type: 'Compliance' as const },
  { id: 'c3', title: 'PF / ESI deposit', date: new Date('2026-07-16'), type: 'Compliance' as const },
];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [titleInput, setTitleInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEvents = async () => {
    try {
      // 1. Fetch approved agent actions
      const { data: actions } = await supabase
        .from('agent_actions')
        .select('id, agent_type, input_message, output_draft, status, created_at')
        .eq('founder_id', FOUNDER_ID)
        .eq('status', 'approved');

      // 2. Fetch manual calendar events (gracefully handling missing table)
      const { data: manualEvents, error: manualErr } = await supabase
        .from('calendar_events')
        .select('id, title, event_date, event_type, created_at')
        .eq('founder_id', FOUNDER_ID);

      const allEvents: CalendarEvent[] = [...COMPLIANCE_DEADLINES];

      // Map hiring/legal agent actions to events
      if (actions) {
        actions.forEach((act) => {
          const parsedTitle =
            (act.output_draft as { text?: string })?.text?.split('\n')[0].replace(/^#+\s*/, '') ||
            act.input_message ||
            'Hiring Opening';

          if (act.agent_type === 'hiring') {
            allEvents.push({
              id: act.id,
              title: `JD Approved: ${parsedTitle}`,
              date: new Date(act.created_at),
              type: 'Hiring',
            });
          } else if (act.agent_type === 'legal') {
            allEvents.push({
              id: act.id,
              title: `Document Finalized: ${parsedTitle}`,
              date: new Date(act.created_at),
              type: 'Legal',
            });
          }
        });
      }

      // Map manual events
      if (!manualErr && manualEvents) {
        manualEvents.forEach((evt) => {
          allEvents.push({
            id: evt.id,
            title: evt.title,
            date: new Date(evt.event_date),
            type: 'Manual',
          });
        });
      }

      setEvents(allEvents);
    } catch (e) {
      console.error('Failed to load calendar events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !dateInput || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('calendar_events').insert({
        founder_id: FOUNDER_ID,
        title: titleInput.trim(),
        event_date: dateInput,
        event_type: 'manual',
      });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist yet, prompt database setup instruction
          alert(
            '⚠️ Database Table Not Found!\n\nPlease run the SQL command in the Supabase SQL Editor to create the calendar_events table:\n\n' +
              'create table calendar_events (\n' +
              '  id uuid primary key default gen_random_uuid(),\n' +
              '  founder_id uuid references founder_profile(id),\n' +
              '  title text NOT NULL,\n' +
              '  event_date date NOT NULL,\n' +
              '  event_type text default \'manual\',\n' +
              '  created_at timestamp default now()\n' +
              ');'
          );
        } else {
          throw error;
        }
      } else {
        setTitleInput('');
        setDateInput('');
        showToast('✅ Scheduled event added successfully!');
        await fetchEvents();
      }
    } catch (err: any) {
      alert(`Failed to schedule event: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Group events chronologically
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getSection = (date: Date) => {
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate < today) return 'Overdue';
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    if (eventDate >= today && eventDate < endOfWeek) return 'This Week';
    return 'Later';
  };

  const sections: Record<'Overdue' | 'This Week' | 'Later', CalendarEvent[]> = {
    Overdue: [],
    'This Week': [],
    Later: [],
  };

  events.forEach((evt) => {
    const sec = getSection(evt.date);
    sections[sec].push(evt);
  });

  // Sort events chronologically inside sections
  sections.Overdue.sort((a, b) => a.date.getTime() - b.date.getTime());
  sections['This Week'].sort((a, b) => a.date.getTime() - b.date.getTime());
  sections.Later.sort((a, b) => a.date.getTime() - b.date.getTime());

  const getBadgeStyles = (type: 'Compliance' | 'Hiring' | 'Legal' | 'Manual') => {
    switch (type) {
      case 'Compliance':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Hiring':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Legal':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Manual':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  const getTypeIcon = (type: 'Compliance' | 'Hiring' | 'Legal' | 'Manual') => {
    switch (type) {
      case 'Compliance':
        return Landmark;
      case 'Hiring':
        return Briefcase;
      case 'Legal':
        return Scale;
      case 'Manual':
        return User;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 text-neutral-100 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-500 border-t-transparent" />
        <p className="text-xs text-neutral-500 mt-3">Loading calendar schedule...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 text-neutral-100 overflow-y-auto pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 rounded-xl bg-neutral-900 border border-neutral-700 px-5 py-3 text-sm text-neutral-100 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-8 py-5 backdrop-blur-md sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-50 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-neutral-450" /> Calendar
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">Scheduled interviews, filing deadlines, and important dates.</p>
        </div>
      </header>

      <div className="p-8 max-w-3xl mx-auto w-full space-y-8">
        {/* Quick Schedule Form Card */}
        <section className="rounded-xl border border-neutral-850 bg-neutral-900/10 p-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Schedule Interview / Milestone</h3>
            <p className="text-[10px] text-neutral-550 mt-0.5">Quickly append manual deadlines or interview dates below</p>
          </div>
          <form onSubmit={handleScheduleEvent} className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                required
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Candidate name, role description, or title..."
                className="w-full rounded-xl border border-neutral-850 bg-neutral-900/40 px-4 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:border-neutral-700 focus:outline-none transition"
              />
            </div>
            <div className="w-full sm:w-auto">
              <input
                type="date"
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-neutral-850 bg-neutral-900/40 px-4 py-2.5 text-xs text-neutral-200 focus:border-neutral-700 focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition shrink-0"
            >
              <Plus className="h-4 w-4" /> Schedule
            </button>
          </form>
        </section>

        {/* List View grouped by sections */}
        <section className="space-y-6">
          {(['Overdue', 'This Week', 'Later'] as const).map((secName) => {
            const secEvents = sections[secName];
            const dotColor = secName === 'Overdue' ? 'bg-red-500' : secName === 'This Week' ? 'bg-amber-500' : 'bg-green-500';
            
            return (
              <div key={secName} className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} /> {secName} ({secEvents.length})
                </h2>
                
                {secEvents.length === 0 ? (
                  <div className="rounded-xl border border-neutral-900 bg-neutral-950/20 p-5 text-center text-xs text-neutral-500">
                    No scheduled items for this section
                  </div>
                ) : (
                  <div className="rounded-xl border border-neutral-850 bg-neutral-900/10 overflow-hidden divide-y divide-neutral-850">
                    {secEvents.map((evt) => {
                      const Icon = getTypeIcon(evt.type);
                      return (
                        <div key={evt.id} className="p-4 flex items-center justify-between gap-4 bg-neutral-950/20 hover:bg-neutral-900/10 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${getBadgeStyles(evt.type)}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-semibold text-neutral-200 truncate">{evt.title}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] text-neutral-500 whitespace-nowrap font-medium">
                              {evt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getBadgeStyles(evt.type)}`}>
                              {evt.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

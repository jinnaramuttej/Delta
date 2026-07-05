'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X, Briefcase, Scale, Landmark, User } from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'Compliance' | 'Hiring' | 'Legal' | 'Manual';
};

// Static compliance deadlines — real Indian startup filing dates
const COMPLIANCE_DEADLINES: CalendarEvent[] = [
  { id: 'c1', title: 'TDS Deposit (Jun)', date: '2026-07-03', type: 'Compliance' },
  { id: 'c2', title: 'GSTR-3B Filing', date: '2026-07-09', type: 'Compliance' },
  { id: 'c3', title: 'PF / ESI Deposit', date: '2026-07-16', type: 'Compliance' },
  { id: 'c4', title: 'Advance Tax Q1', date: '2026-07-15', type: 'Compliance' },
  { id: 'c5', title: 'GSTR-1 Filing', date: '2026-07-11', type: 'Compliance' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const TYPE_STYLES: Record<string, { bg: string; dot: string; border: string; icon: any; badge: string }> = {
  Compliance: { bg: 'bg-green-500/10',  dot: 'bg-green-400',  border: 'border-green-500/30',  icon: Landmark, badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
  Hiring:     { bg: 'bg-blue-500/10',   dot: 'bg-blue-400',   border: 'border-blue-500/30',   icon: Briefcase, badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  Legal:      { bg: 'bg-amber-500/10',  dot: 'bg-amber-400',  border: 'border-amber-500/30',  icon: Scale,     badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  Manual:     { bg: 'bg-purple-500/10', dot: 'bg-purple-400', border: 'border-purple-500/30', icon: User,      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

// For overdue compliance: use red tint
function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date(toYMD(new Date()));
}

export default function CalendarPage() {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents]       = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // YYYY-MM-DD

  // Quick-add form state
  const [titleInput, setTitleInput] = useState('');
  const [dateInput,  setDateInput]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // ─── Fetch Events ─────────────────────────────────────────────
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const allEvents: CalendarEvent[] = [...COMPLIANCE_DEADLINES];

      const { data: actions } = await supabase
        .from('agent_actions')
        .select('id, agent_type, input_message, output_draft, status, created_at')
        .eq('founder_id', FOUNDER_ID)
        .eq('status', 'approved');

      if (actions) {
        actions.forEach((act) => {
          const parsedTitle =
            (act.output_draft as { text?: string })?.text?.split('\n')[0].replace(/^#+\s*/, '').slice(0, 60) ||
            act.input_message?.slice(0, 60) ||
            'Draft';

          const dateStr = toYMD(new Date(act.created_at));

          if (act.agent_type === 'hiring') {
            allEvents.push({ id: act.id, title: `JD Approved: ${parsedTitle}`, date: dateStr, type: 'Hiring' });
          } else if (act.agent_type === 'legal') {
            allEvents.push({ id: act.id, title: `Doc Finalized: ${parsedTitle}`, date: dateStr, type: 'Legal' });
          }
        });
      }

      const { data: manualRows, error: manErr } = await supabase
        .from('calendar_events')
        .select('id, title, event_date, event_type')
        .eq('founder_id', FOUNDER_ID);

      if (!manErr && manualRows) {
        manualRows.forEach((evt) => {
          allEvents.push({ id: evt.id, title: evt.title, date: evt.event_date, type: 'Manual' });
        });
      }

      setEvents(allEvents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  // ─── Quick-add submit ─────────────────────────────────────────
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
          alert(
            '⚠️ Run this SQL in Supabase first:\n\n' +
            'create table calendar_events (\n  id uuid primary key default gen_random_uuid(),\n  founder_id uuid references founder_profile(id),\n  title text NOT NULL,\n  event_date date NOT NULL,\n  event_type text default \'manual\',\n  created_at timestamp default now()\n);'
          );
        } else throw error;
      } else {
        setTitleInput(''); setDateInput('');
        showToast('✅ Event added!');
        await fetchEvents();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Calendar grid calculation ────────────────────────────────
  const firstDayOfMonth  = new Date(viewYear, viewMonth, 1).getDay();    // 0 = Sun
  const daysInMonth      = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth  = new Date(viewYear, viewMonth, 0).getDate();

  // total cells: pad to multiple of 7
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Build event map: { 'YYYY-MM-DD': CalendarEvent[] }
  const eventMap: Record<string, CalendarEvent[]> = {};
  events.forEach((evt) => {
    if (!eventMap[evt.date]) eventMap[evt.date] = [];
    eventMap[evt.date].push(evt);
  });

  const todayYMD = toYMD(today);

  // Dominant type for a cell (first event's type, prefer Compliance > Hiring > Legal > Manual)
  const dominantType = (evts: CalendarEvent[]): string => {
    const priority = ['Compliance', 'Hiring', 'Legal', 'Manual'];
    for (const p of priority) { if (evts.find(e => e.type === p)) return p; }
    return evts[0].type;
  };

  const selectedEvents = selectedDay ? (eventMap[selectedDay] ?? []) : [];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 text-neutral-100 overflow-y-auto pb-24">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-neutral-900 border border-neutral-700 px-5 py-3 text-sm text-neutral-100 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-8 py-5 backdrop-blur-md sticky top-0 z-30">
        <h1 className="text-xl font-bold tracking-tight text-neutral-50 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-neutral-400" /> Calendar
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5 font-medium">Scheduled interviews, filing deadlines, and important dates.</p>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-6">

        {/* Quick-add form */}
        <section className="rounded-xl border border-neutral-850 bg-neutral-900/10 p-5 space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Schedule Interview / Milestone</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Quickly append manual deadlines or interview dates below</p>
          </div>
          <form onSubmit={handleScheduleEvent} className="flex flex-col sm:flex-row gap-3 items-end">
            <input
              type="text" required value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              placeholder="Candidate name or event title..."
              className="flex-1 rounded-xl border border-neutral-850 bg-neutral-900/40 px-4 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:border-neutral-700 focus:outline-none transition"
            />
            <input
              type="date" required value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              className="rounded-xl border border-neutral-850 bg-neutral-900/40 px-4 py-2.5 text-xs text-neutral-200 focus:border-neutral-700 focus:outline-none transition"
            />
            <button
              type="submit" disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition shrink-0"
            >
              <Plus className="h-4 w-4" /> Schedule
            </button>
          </form>
        </section>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/20 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200 transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <h2 className="text-base font-bold text-neutral-100 tracking-tight">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button
            onClick={nextMonth}
            className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/20 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200 transition"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-xl border border-neutral-800 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-neutral-800">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="h-72 flex items-center justify-center text-xs text-neutral-500 animate-pulse">
              Loading events…
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }, (_, i) => {
                // cell day number (1-based)
                const cellDay  = i - firstDayOfMonth + 1;
                const isPrev   = cellDay < 1;
                const isNext   = cellDay > daysInMonth;
                const isGhost  = isPrev || isNext;

                const displayDay  = isPrev ? daysInPrevMonth + cellDay : isNext ? cellDay - daysInMonth : cellDay;
                const cellDateStr = isGhost ? '' : `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(cellDay).padStart(2, '0')}`;
                const cellEvents  = cellDateStr ? (eventMap[cellDateStr] ?? []) : [];
                const hasEvents   = cellEvents.length > 0;
                const isToday     = cellDateStr === todayYMD;
                const isSelected  = cellDateStr === selectedDay;
                const domType     = hasEvents ? dominantType(cellEvents) : null;
                const styles      = domType ? TYPE_STYLES[domType] : null;

                // Overdue compliance: red tint override
                const allOverdue = hasEvents && cellEvents.every(e => e.type === 'Compliance' && isOverdue(cellDateStr));

                return (
                  <div
                    key={i}
                    onClick={() => !isGhost && hasEvents && setSelectedDay(isSelected ? null : cellDateStr)}
                    className={[
                      'relative min-h-[72px] p-2 border-b border-r border-neutral-800/60 flex flex-col',
                      // last row: remove bottom border
                      i >= totalCells - 7 ? 'border-b-0' : '',
                      // last col: remove right border
                      (i + 1) % 7 === 0 ? 'border-r-0' : '',
                      // ghost days
                      isGhost ? 'bg-neutral-950/30' : 'bg-neutral-950',
                      // event tint
                      !isGhost && hasEvents && !isSelected ? (allOverdue ? 'bg-red-500/5' : styles?.bg ?? '') : '',
                      // selected state
                      isSelected ? 'bg-neutral-800/60 border-neutral-700' : '',
                      // hover
                      !isGhost && hasEvents ? 'cursor-pointer hover:border-neutral-700 hover:bg-neutral-800/40 transition-colors' : '',
                    ].join(' ')}
                  >
                    {/* Day number */}
                    <span className={[
                      'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                      isToday ? 'bg-neutral-100 text-neutral-950' : isGhost ? 'text-neutral-700' : 'text-neutral-400',
                    ].join(' ')}>
                      {displayDay}
                    </span>

                    {/* Event dots */}
                    {!isGhost && hasEvents && (
                      <div className="flex flex-wrap gap-1 mt-1.5 px-0.5">
                        {cellEvents.slice(0, 3).map((evt) => {
                          const s = TYPE_STYLES[evt.type];
                          const overdue = evt.type === 'Compliance' && isOverdue(cellDateStr);
                          return (
                            <span
                              key={evt.id}
                              className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${overdue ? 'bg-red-400' : s.dot}`}
                              title={evt.title}
                            />
                          );
                        })}
                        {cellEvents.length > 3 && (
                          <span className="text-[9px] text-neutral-500 font-semibold leading-none mt-0.5">
                            +{cellEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Count badge in corner when many events */}
                    {!isGhost && cellEvents.length >= 2 && (
                      <span className={[
                        'absolute top-1.5 right-1.5 rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center',
                        allOverdue ? 'bg-red-500/20 text-red-400' : (styles?.badge ?? 'bg-neutral-800 text-neutral-400'),
                      ].join(' ')}>
                        {cellEvents.length}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-1">
          {Object.entries(TYPE_STYLES).map(([type, s]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-[10px] text-neutral-500 font-medium">{type}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[10px] text-neutral-500 font-medium">Overdue Compliance</span>
          </div>
        </div>

        {/* Day Events Detail Panel */}
        {selectedDay && selectedEvents.length > 0 && (
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
              <h3 className="text-xs font-bold text-neutral-200">
                Events on{' '}
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-neutral-800">
              {selectedEvents.map((evt) => {
                const s = TYPE_STYLES[evt.type];
                const Icon = s.icon;
                const overdue = evt.type === 'Compliance' && isOverdue(evt.date);
                return (
                  <div key={evt.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${s.badge}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-200 truncate">{evt.title}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {new Date(evt.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ${overdue ? 'bg-red-500/10 text-red-400 border-red-500/20' : s.badge}`}>
                      {overdue ? 'Overdue' : evt.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

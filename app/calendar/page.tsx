'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, X,
  Briefcase, Scale, Landmark, User, Clock, AlertTriangle, FileText
} from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;           // YYYY-MM-DD
  type: 'Compliance' | 'Hiring' | 'Legal' | 'Manual';
  description: string;    // full text / detail shown in panel
  meta?: string;          // e.g. "Prompt: ..." or "Role: ..."
  createdAt?: string;     // ISO timestamp
};

// Static compliance deadlines with full descriptions
const COMPLIANCE_DEADLINES: CalendarEvent[] = [
  {
    id: 'c1', type: 'Compliance', date: '2026-07-03',
    title: 'TDS Deposit (Jun)',
    description: 'Deposit Tax Deducted at Source (TDS) for the month of June. Applicable on salaries, professional fees, and contractor payments. Late payment attracts 1.5% interest per month under Section 201(1A) of the Income Tax Act.',
    meta: 'Section 192 / 194C / 194J · Due: 7th of following month',
  },
  {
    id: 'c2', type: 'Compliance', date: '2026-07-09',
    title: 'GSTR-3B Filing',
    description: 'File GSTR-3B (monthly summary GST return) for the previous month. This return includes outward supplies, input tax credit availed, and tax paid. Non-filing attracts a late fee of ₹50/day (₹20/day for nil returns) plus 18% interest on unpaid tax.',
    meta: 'GST Compliance · Monthly Return',
  },
  {
    id: 'c3', type: 'Compliance', date: '2026-07-16',
    title: 'PF / ESI Deposit',
    description: 'Deposit Provident Fund (PF) and Employee State Insurance (ESI) contributions for the previous month. PF: 12% employee + 12% employer on basic wage. ESI: 0.75% employee + 3.25% employer on gross salary (for employees earning ≤ ₹21,000/month).',
    meta: 'EPFO / ESIC · Due: 15th of each month',
  },
  {
    id: 'c4', type: 'Compliance', date: '2026-07-15',
    title: 'Advance Tax Q1',
    description: 'First installment of advance tax for FY 2026-27 (Q1). If total tax liability exceeds ₹10,000 for the year, you must pay 15% of estimated annual tax by June 15. Late payment attracts interest under Section 234B and 234C.',
    meta: 'Advance Tax · 15% of annual liability due',
  },
  {
    id: 'c5', type: 'Compliance', date: '2026-07-11',
    title: 'GSTR-1 Filing',
    description: 'File GSTR-1 (details of outward supplies) for the previous month. This return captures all B2B and B2C sales invoices. Data filed here flows to your buyers\' GSTR-2B for ITC reconciliation. Late fee of ₹50/day applicable.',
    meta: 'GST Compliance · Outward Supplies Return',
  },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const TYPE_STYLES: Record<string, { bg: string; dot: string; icon: any; badge: string; iconBg: string }> = {
  Compliance: { bg: 'bg-green-500/10',  dot: 'bg-green-400',  icon: Landmark, badge: 'bg-green-500/10 text-green-400 border-green-500/20',  iconBg: 'bg-green-500/10 border-green-500/20 text-green-400' },
  Hiring:     { bg: 'bg-blue-500/10',   dot: 'bg-blue-400',   icon: Briefcase, badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400'   },
  Legal:      { bg: 'bg-amber-500/10',  dot: 'bg-amber-400',  icon: Scale,     badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  Manual:     { bg: 'bg-purple-500/10', dot: 'bg-purple-400', icon: User,      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
};

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00') < new Date(toYMD(new Date()) + 'T00:00:00');
}

export default function CalendarPage() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events,    setEvents]    = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [titleInput,  setTitleInput]  = useState('');
  const [dateInput,   setDateInput]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // ─── Fetch all events from DB ──────────────────────────────────
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const allEvents: CalendarEvent[] = [...COMPLIANCE_DEADLINES];

      // 1. Approved agent_actions (hiring + legal) — fetch full output_draft
      const { data: actions } = await supabase
        .from('agent_actions')
        .select('id, agent_type, input_message, output_draft, status, created_at')
        .eq('founder_id', FOUNDER_ID)
        .eq('status', 'approved');

      if (actions) {
        actions.forEach((act) => {
          const fullDraft: string =
            (act.output_draft as { text?: string })?.text ?? '';
          const firstLine = fullDraft.split('\n')[0].replace(/^#+\s*/, '').slice(0, 80) || act.input_message || 'Approved Draft';
          const dateStr = toYMD(new Date(act.created_at));

          if (act.agent_type === 'hiring') {
            allEvents.push({
              id: act.id,
              title: `JD Approved: ${firstLine}`,
              date: dateStr,
              type: 'Hiring',
              description: fullDraft || `Approved hiring job description draft generated from prompt: "${act.input_message}".`,
              meta: `Prompt: "${act.input_message}"`,
              createdAt: act.created_at,
            });
          } else if (act.agent_type === 'legal') {
            allEvents.push({
              id: act.id,
              title: `Doc Finalized: ${firstLine}`,
              date: dateStr,
              type: 'Legal',
              description: fullDraft || `Approved legal document draft generated from prompt: "${act.input_message}".`,
              meta: `Prompt: "${act.input_message}"`,
              createdAt: act.created_at,
            });
          }
        });
      }

      // 2. Manual calendar_events from DB
      const { data: manualRows, error: manErr } = await supabase
        .from('calendar_events')
        .select('id, title, event_date, event_type, created_at')
        .eq('founder_id', FOUNDER_ID)
        .order('event_date', { ascending: true });

      if (!manErr && manualRows) {
        manualRows.forEach((evt) => {
          allEvents.push({
            id: evt.id,
            title: evt.title,
            date: evt.event_date,
            type: 'Manual',
            description: `Manually scheduled event: "${evt.title}". Added on ${new Date(evt.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
            meta: `Type: ${evt.event_type}`,
            createdAt: evt.created_at,
          });
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

  // ─── Quick-add form ────────────────────────────────────────────
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
            '⚠️ Run this SQL in Supabase SQL Editor first:\n\n' +
            'create table calendar_events (\n  id uuid primary key default gen_random_uuid(),\n  founder_id uuid references founder_profile(id),\n  title text NOT NULL,\n  event_date date NOT NULL,\n  event_type text default \'manual\',\n  created_at timestamp default now()\n);\n\nALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;'
          );
        } else throw error;
      } else {
        setTitleInput(''); setDateInput('');
        showToast('✅ Event scheduled!');
        await fetchEvents();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Grid math ─────────────────────────────────────────────────
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const totalCells      = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
  const todayYMD        = toYMD(today);

  const prevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build event map keyed by YYYY-MM-DD
  const eventMap: Record<string, CalendarEvent[]> = {};
  events.forEach(evt => {
    if (!eventMap[evt.date]) eventMap[evt.date] = [];
    eventMap[evt.date].push(evt);
  });

  const dominantType = (evts: CalendarEvent[]) => {
    for (const p of ['Compliance', 'Hiring', 'Legal', 'Manual']) {
      if (evts.find(e => e.type === p)) return p;
    }
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
            <p className="text-[10px] text-neutral-500 mt-0.5">Add a manual deadline, interview, or important date</p>
          </div>
          <form onSubmit={handleScheduleEvent} className="flex flex-col sm:flex-row gap-3 items-end">
            <input
              type="text" required value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              placeholder="Candidate name, interview, or milestone title..."
              className="flex-1 rounded-xl border border-neutral-850 bg-neutral-900/40 px-4 py-2.5 text-xs text-neutral-200 placeholder-neutral-600 focus:border-neutral-700 focus:outline-none transition"
            />
            <input
              type="date" required value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              className="rounded-xl border border-neutral-850 bg-neutral-900/40 px-4 py-2.5 text-xs text-neutral-200 focus:border-neutral-700 focus:outline-none transition"
            />
            <button
              type="submit" disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition shrink-0 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Schedule
            </button>
          </form>
        </section>

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/20 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200 transition">
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <h2 className="text-base font-bold text-neutral-100 tracking-tight">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button onClick={nextMonth} className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/20 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200 transition">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="rounded-xl border border-neutral-800 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-neutral-800">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center text-xs text-neutral-500 animate-pulse">Loading events…</div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }, (_, i) => {
                const cellDay    = i - firstDayOfMonth + 1;
                const isPrev     = cellDay < 1;
                const isNext     = cellDay > daysInMonth;
                const isGhost    = isPrev || isNext;
                const displayDay = isPrev ? daysInPrevMonth + cellDay : isNext ? cellDay - daysInMonth : cellDay;
                const cellDateStr = isGhost ? '' : `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(cellDay).padStart(2, '0')}`;
                const cellEvents = cellDateStr ? (eventMap[cellDateStr] ?? []) : [];
                const hasEvents  = cellEvents.length > 0;
                const isToday    = cellDateStr === todayYMD;
                const isSelected = cellDateStr === selectedDay;
                const domType    = hasEvents ? dominantType(cellEvents) : null;
                const styles     = domType ? TYPE_STYLES[domType] : null;
                const allOverdue = hasEvents && cellEvents.every(e => e.type === 'Compliance' && isOverdue(cellDateStr));

                return (
                  <div
                    key={i}
                    onClick={() => !isGhost && hasEvents && setSelectedDay(isSelected ? null : cellDateStr)}
                    className={[
                      'relative min-h-[76px] p-2 border-b border-r border-neutral-800/60 flex flex-col',
                      i >= totalCells - 7 ? 'border-b-0' : '',
                      (i + 1) % 7 === 0 ? 'border-r-0' : '',
                      isGhost ? 'bg-neutral-950/30' : 'bg-neutral-950',
                      !isGhost && hasEvents && !isSelected ? (allOverdue ? 'bg-red-500/5' : (styles?.bg ?? '')) : '',
                      isSelected ? 'bg-neutral-800/40 ring-1 ring-inset ring-neutral-700' : '',
                      !isGhost && hasEvents ? 'cursor-pointer hover:bg-neutral-900/50 transition-colors' : '',
                    ].join(' ')}
                  >
                    {/* Day number */}
                    <span className={[
                      'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full shrink-0',
                      isToday ? 'bg-neutral-100 text-neutral-950' : isGhost ? 'text-neutral-700' : 'text-neutral-400',
                    ].join(' ')}>
                      {displayDay}
                    </span>

                    {/* Event mini-labels (show up to 2 short titles) */}
                    {!isGhost && hasEvents && (
                      <div className="mt-1 space-y-0.5 flex-1">
                        {cellEvents.slice(0, 2).map(evt => {
                          const overdue = evt.type === 'Compliance' && isOverdue(cellDateStr);
                          const dot = overdue ? 'bg-red-400' : TYPE_STYLES[evt.type].dot;
                          return (
                            <div key={evt.id} className="flex items-center gap-1 min-w-0">
                              <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${dot}`} />
                              <span className="text-[9px] text-neutral-400 truncate leading-tight">{evt.title}</span>
                            </div>
                          );
                        })}
                        {cellEvents.length > 2 && (
                          <span className="text-[9px] text-neutral-600 pl-2.5">+{cellEvents.length - 2} more</span>
                        )}
                      </div>
                    )}

                    {/* Count badge top-right */}
                    {!isGhost && cellEvents.length >= 2 && (
                      <span className={[
                        'absolute top-1.5 right-1.5 rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center border',
                        allOverdue ? 'bg-red-500/20 text-red-400 border-red-500/30' : (styles?.badge ?? 'bg-neutral-800 text-neutral-400 border-neutral-700'),
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

        {/* ─── Day Detail Panel ─────────────────────────────────── */}
        {selectedDay && selectedEvents.length > 0 && (
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/10 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/30">
              <div>
                <h3 className="text-sm font-bold text-neutral-100">
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''} scheduled
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Event cards */}
            <div className="divide-y divide-neutral-800/70">
              {selectedEvents.map((evt) => {
                const s       = TYPE_STYLES[evt.type];
                const Icon    = s.icon;
                const overdue = evt.type === 'Compliance' && isOverdue(evt.date);

                return (
                  <div key={evt.id} className="p-5 space-y-3">
                    {/* Event header row */}
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${s.iconBg}`}>
                        {overdue ? <AlertTriangle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-neutral-100 leading-snug">{evt.title}</p>
                          <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ${overdue ? 'bg-red-500/10 text-red-400 border-red-500/20' : s.badge}`}>
                            {overdue ? 'Overdue' : evt.type}
                          </span>
                        </div>
                        {evt.meta && (
                          <p className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {evt.meta}
                          </p>
                        )}
                        {evt.createdAt && (
                          <p className="text-[10px] text-neutral-600 mt-0.5">
                            Logged: {new Date(evt.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Full description */}
                    {evt.description && (
                      <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileText className="h-3 w-3 text-neutral-500" />
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
                            {evt.type === 'Hiring' || evt.type === 'Legal' ? 'Draft Content' : 'Details'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                          {evt.description}
                        </p>
                      </div>
                    )}
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

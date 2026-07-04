'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

type ActionCard = {
  id: string;
  agentUsed: 'finance' | 'hiring' | 'legal' | 'gtm';
  inputMessage: string;
  draft: string;
  requiresApproval: boolean;
  status: string; // 'pending' | 'approved' | 'rejected'
  createdAt: string;
};

export default function Dashboard() {
  const [pending, setPending] = useState<ActionCard[]>([]);
  const [recent, setRecent] = useState<ActionCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending actions & recent actions
  const fetchActions = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_actions')
        .select('id, agent_type, input_message, output_draft, requires_approval, status, created_at')
        .eq('founder_id', FOUNDER_ID)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: ActionCard[] = data.map((row) => ({
          id: row.id,
          agentUsed: row.agent_type as any,
          inputMessage: row.input_message,
          draft: (row.output_draft as { text?: string })?.text ?? '',
          requiresApproval: row.requires_approval,
          status: row.status,
          createdAt: row.created_at,
        }));

        // Filter for Pending Approvals
        setPending(mapped.filter((a) => a.status === 'pending' && a.requiresApproval));
        // Take top 10 for Recent Activity
        setRecent(mapped.slice(0, 10));
      }
    } catch (err) {
      console.error('Failed fetching dashboard items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleUpdateStatus = async (id: string, nextStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('agent_actions')
        .update({ status: nextStatus, approved: nextStatus === 'approved' })
        .eq('id', id);

      if (!error) {
        // Refresh feed contents
        fetchActions();
      }
    } catch (err: any) {
      alert(`Action update failed: ${err.message}`);
    }
  };

  const badgeClasses: Record<string, string> = {
    hiring: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    finance: 'bg-green-500/10 text-green-400 border border-green-500/20',
    legal: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    gtm: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  };

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden bg-neutral-950">
      {/* Center content: Dashboard Analytics & Recent Activity */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8 border-r border-neutral-800/80">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Overview of your startup performance indicators</p>
        </header>

        {loading ? (
          <div className="space-y-6">
            <div className="h-40 w-full animate-pulse rounded-xl bg-neutral-900" />
            <div className="h-60 w-full animate-pulse rounded-xl bg-neutral-900" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Analytics Stats & Simple Mini Graphs */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Hiring Pipeline</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl font-bold text-neutral-100">4</p>
                  <p className="text-xs text-neutral-500 font-medium">Active Roles</p>
                </div>
                {/* Visual Pipeline Bar chart */}
                <div className="mt-4 flex gap-1 items-end h-8">
                  <div className="w-full bg-blue-500/10 rounded-t h-1/3 hover:bg-blue-500/35 transition" />
                  <div className="w-full bg-blue-500/15 rounded-t h-2/3 hover:bg-blue-500/35 transition" />
                  <div className="w-full bg-blue-500/20 rounded-t h-1/2 hover:bg-blue-500/35 transition" />
                  <div className="w-full bg-blue-500 rounded-t h-full hover:bg-blue-500/80 transition" />
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Monthly Burn</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl font-bold text-neutral-100">$18,400</p>
                  <p className="text-xs text-green-400 font-medium">-4.2% MoM</p>
                </div>
                {/* SVG Mini Area Graph */}
                <div className="mt-4 h-8 w-full">
                  <svg className="w-full h-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,10 L0,8 L20,6 L40,9 L60,4 L80,5 L100,2 L100,10 Z" fill="url(#burnGrad)" />
                    <path d="M0,8 L20,6 L40,9 L60,4 L80,5 L100,2" fill="none" stroke="#22c55e" strokeWidth="0.8" />
                  </svg>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Runway Remaining</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl font-bold text-neutral-100">14.2</p>
                  <p className="text-xs text-neutral-500 font-medium">Months</p>
                </div>
                {/* Runway Progress Meter */}
                <div className="mt-5 w-full bg-neutral-850 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full w-[70%]" />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[9px] text-neutral-500 font-medium">
                  <span>0m</span>
                  <span>Critical (6m)</span>
                  <span>Goal (18m)</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <section>
              <h2 className="text-base font-semibold text-neutral-200 mb-4">Recent Activity</h2>
              {recent.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 text-center text-sm text-neutral-500">
                  No recent activity logged.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/10">
                  <div className="divide-y divide-neutral-800">
                    {recent.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-4 hover:bg-neutral-900/20 transition duration-150">
                        <div className="flex items-center gap-4 min-w-0">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              badgeClasses[card.agentUsed]
                            }`}
                          >
                            {card.agentUsed}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-200">
                              {card.draft ? card.draft.split('\n')[0].replace(/^#+\s*/, '') : 'Draft'}
                            </p>
                            <p className="truncate text-xs text-neutral-500">Prompt: "{card.inputMessage}"</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span className="text-xs text-neutral-500">
                            {new Date(card.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {card.requiresApproval ? (
                            card.status === 'approved' ? (
                              <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400 border border-green-500/20">
                                Approved
                              </span>
                            ) : card.status === 'rejected' ? (
                              <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/20">
                                Rejected
                              </span>
                            ) : (
                              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20 animate-pulse">
                                Pending
                              </span>
                            )
                          ) : (
                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-400">
                              Info
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Right Content Sidebar: Pending Approvals (Smaller/Compact Layout) */}
      <div className="w-80 shrink-0 flex flex-col bg-neutral-950 p-6 overflow-y-auto">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
          Approvals Required
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">
              {pending.length}
            </span>
          )}
        </h2>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 rounded-xl bg-neutral-900" />
            <div className="h-32 rounded-xl bg-neutral-900" />
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 text-center text-xs text-neutral-500">
            No items awaiting your approval.
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((card) => (
              <div
                key={card.id}
                className="rounded-xl border border-amber-500/20 bg-neutral-900/10 p-4 shadow-sm hover:border-amber-500/30 transition duration-150"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                      badgeClasses[card.agentUsed]
                    }`}
                  >
                    {card.agentUsed}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {new Date(card.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-neutral-200 mb-1 leading-snug">
                  {card.draft ? card.draft.split('\n')[0].replace(/^#+\s*/, '') : 'Draft'}
                </h3>
                <p className="text-[11px] text-neutral-400 line-clamp-3 whitespace-pre-line leading-normal mb-3">
                  {card.draft}
                </p>

                <div className="flex gap-2 border-t border-neutral-800/80 pt-2.5">
                  <button
                    onClick={() => handleUpdateStatus(card.id, 'approved')}
                    className="flex-1 rounded-lg bg-neutral-100 py-1 text-[10px] font-semibold text-neutral-950 hover:bg-neutral-200 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(card.id, 'rejected')}
                    className="flex-1 rounded-lg border border-neutral-800 bg-transparent py-1 text-[10px] font-semibold text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/40 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

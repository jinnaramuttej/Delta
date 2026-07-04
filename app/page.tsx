'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

type ActionCard = {
  id: string;
  agentUsed: 'finance' | 'hiring' | 'legal' | 'gtm';
  inputMessage: string;
  draft: string;
  requiresApproval: boolean;
  status: string;
  createdAt: string;
};

type FinanceSnapshot = {
  monthly_burn: number;
  cash_in_bank: number;
  runway_months: number;
} | null;

export default function Dashboard() {
  const [pending, setPending] = useState<ActionCard[]>([]);
  const [recent, setRecent] = useState<ActionCard[]>([]);
  const [todayActivity, setTodayActivity] = useState<ActionCard[]>([]);
  const [financeSnapshot, setFinanceSnapshot] = useState<FinanceSnapshot>(null);
  const [loading, setLoading] = useState(true);

  // Counters for activity cards
  const [stats, setStats] = useState({
    hiring: { drafted: 0, approved: 0 },
    legal: { drafted: 0, approved: 0 },
    gtm: { drafted: 0, approved: 0 },
  });

  const fetchActions = async () => {
    try {
      // 1. Fetch Agent Actions
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

        setPending(mapped.filter((a) => a.status === 'pending' && a.requiresApproval));
        setRecent(mapped.slice(0, 10));

        // Filter activity within last 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        setTodayActivity(mapped.filter((a) => new Date(a.createdAt) >= oneDayAgo));

        // Compute stats for activity cards
        const nextStats = {
          hiring: { drafted: 0, approved: 0 },
          legal: { drafted: 0, approved: 0 },
          gtm: { drafted: 0, approved: 0 },
        };

        mapped.forEach((a) => {
          if (a.agentUsed === 'hiring') {
            nextStats.hiring.drafted++;
            if (a.status === 'approved') nextStats.hiring.approved++;
          } else if (a.agentUsed === 'legal') {
            nextStats.legal.drafted++;
            if (a.status === 'approved') nextStats.legal.approved++;
          } else if (a.agentUsed === 'gtm') {
            nextStats.gtm.drafted++;
            if (a.status === 'approved') nextStats.gtm.approved++;
          }
        });

        setStats(nextStats);
      }

      // 2. Fetch Finance Snapshot if available
      const { data: finData, error: finErr } = await supabase
        .from('finance_snapshots')
        .select('monthly_burn, cash_in_bank, runway_months')
        .eq('founder_id', FOUNDER_ID)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!finErr && finData) {
        setFinanceSnapshot(finData as FinanceSnapshot);
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
        fetchActions();
      }
    } catch (err: any) {
      alert(`Action update failed: ${err.message}`);
    }
  };

  // Helper for relative time display
  const getRelativeTime = (dateStr: string) => {
    const ms = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) {
      const minutes = Math.floor(ms / (1000 * 60));
      return `${minutes}m ago`;
    }
    return `${hours}h ago`;
  };

  const badgeClasses: Record<string, string> = {
    hiring: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    finance: 'bg-green-500/10 text-green-400 border border-green-500/20',
    legal: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    gtm: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  };

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden bg-neutral-950">
      {/* Center content */}
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
            {/* Real Stats Activity Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Hiring Card */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Hiring Activity</p>
                <p className="mt-2 text-2xl font-bold text-neutral-100">{stats.hiring.drafted} Roles</p>
                <p className="mt-1 text-xs text-neutral-500">{stats.hiring.approved} approved by you</p>
              </div>

              {/* Legal Card */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Legal Activity</p>
                <p className="mt-2 text-2xl font-bold text-neutral-100">{stats.legal.drafted} Drafts</p>
                <p className="mt-1 text-xs text-neutral-500">{stats.legal.approved} verified & approved</p>
              </div>

              {/* Finance snapshots card */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5 flex flex-col justify-between min-h-[110px]">
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Burn & Runway</p>
                  {financeSnapshot ? (
                    <>
                      <p className="mt-2 text-2xl font-bold text-neutral-100">
                        {financeSnapshot.runway_months.toFixed(1)}m runway
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Burn: ${financeSnapshot.monthly_burn.toLocaleString()}/mo
                      </p>
                    </>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xs text-neutral-400">No data yet.</p>
                      <Link href="/finance" className="mt-1 inline-block text-[11px] text-green-400 hover:underline">
                        Log your first snapshot →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* GTM Card */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">GTM Campaigns</p>
                <p className="mt-2 text-2xl font-bold text-neutral-100">{stats.gtm.drafted} Assets</p>
                <p className="mt-1 text-xs text-neutral-500">{stats.gtm.approved} published copy</p>
              </div>
            </div>

            {/* Today's Activity Section */}
            <section>
              <h2 className="text-base font-semibold text-neutral-200 mb-4">Today's Activity</h2>
              {todayActivity.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5 text-center text-xs text-neutral-500">
                  No activity recorded in the past 24 hours.
                </div>
              ) : (
                <div className="relative border-l border-neutral-800 ml-3 pl-5 space-y-4 py-2">
                  {todayActivity.map((act) => (
                    <div key={act.id} className="relative flex items-center justify-between">
                      {/* Timeline dot */}
                      <span className="absolute -left-[26px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-neutral-950 border border-neutral-850">
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                              badgeClasses[act.agentUsed]
                            }`}
                          >
                            {act.agentUsed}
                          </span>
                          <p className="text-sm font-medium text-neutral-250 truncate">
                            {act.draft ? act.draft.split('\n')[0].replace(/^#+\s*/, '') : 'Draft'}
                          </p>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5 truncate">Prompt: "{act.inputMessage}"</p>
                      </div>
                      <span className="text-xs text-neutral-500 shrink-0 ml-4">
                        {getRelativeTime(act.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Activity */}
            <section>
              <h2 className="text-base font-semibold text-neutral-200 mb-4">Recent Activity (All-Time)</h2>
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

      {/* Right Content Sidebar: Pending Approvals */}
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

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
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-neutral-950 p-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Overview of all pending actions and recent activity</p>
      </header>

      {loading ? (
        <div className="space-y-6">
          <div className="h-40 w-full animate-pulse rounded-xl bg-neutral-900" />
          <div className="h-60 w-full animate-pulse rounded-xl bg-neutral-900" />
        </div>
      ) : (
        <div className="space-y-10 max-w-4xl">
          {/* Pending Approvals Section */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-4 flex items-center gap-2">
              Pending Approvals
              {pending.length > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 border border-amber-500/20">
                  {pending.length}
                </span>
              )}
            </h2>

            {pending.length === 0 ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 text-center text-sm text-neutral-500">
                No pending actions requiring approval.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {pending.map((card) => (
                  <div
                    key={card.id}
                    className="flex flex-col justify-between rounded-xl border border-amber-500/20 bg-neutral-900/10 p-5 shadow-sm hover:border-amber-500/30 transition-all duration-200"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            badgeClasses[card.agentUsed]
                          }`}
                        >
                          {card.agentUsed}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {new Date(card.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-neutral-200 mb-1 leading-snug">
                        {card.draft ? card.draft.split('\n')[0].replace(/^#+\s*/, '') : 'Draft'}
                      </h3>
                      <p className="text-xs italic text-neutral-500 mb-2">Prompt: "{card.inputMessage}"</p>
                      <p className="text-xs text-neutral-400 line-clamp-3 whitespace-pre-line leading-relaxed">
                        {card.draft}
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-neutral-800/80 pt-3">
                      <button
                        onClick={() => handleUpdateStatus(card.id, 'approved')}
                        className="rounded-lg bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(card.id, 'rejected')}
                        className="rounded-lg border border-neutral-800 bg-transparent px-3 py-1 text-xs font-semibold text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/40"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Activity Section */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-200 mb-4">Recent Activity</h2>

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
  );
}

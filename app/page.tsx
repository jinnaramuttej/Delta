'use client';

import { useState, useEffect, useRef } from 'react';
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

type FounderProfile = {
  name: string;
  startup_name: string;
};

export default function Home() {
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [actions, setActions] = useState<ActionCard[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch founder profile and existing actions on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Founder Profile
        const { data: profileData, error: profileErr } = await supabase
          .from('founder_profile')
          .select('name, startup_name')
          .eq('id', FOUNDER_ID)
          .single();

        if (profileErr) {
          console.error('Error fetching profile:', profileErr.message);
        } else if (profileData) {
          setProfile(profileData as FounderProfile);
        }

        // Fetch Existing Actions
        const { data: actionsData, error: actionsErr } = await supabase
          .from('agent_actions')
          .select('id, agent_type, input_message, output_draft, requires_approval, status, created_at')
          .eq('founder_id', FOUNDER_ID)
          .order('created_at', { ascending: false });

        if (actionsErr) {
          console.error('Error fetching actions:', actionsErr.message);
        } else if (actionsData) {
          const mapped: ActionCard[] = actionsData.map((row) => ({
            id: row.id,
            agentUsed: row.agent_type as any,
            inputMessage: row.input_message,
            draft: (row.output_draft as { text?: string })?.text ?? '',
            requiresApproval: row.requires_approval,
            status: row.status,
            createdAt: row.created_at,
          }));
          setActions(mapped);
        }
      } catch (err) {
        console.error('Failed initialization:', err);
      }
    }
    fetchData();
  }, []);

  // 2. Auto-scroll to top when a new action is added (or feed changes)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [actions, loading]);

  // 3. Submit orchestrate message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: FOUNDER_ID, message: userMessage }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errText}`);
      }

      const data = await res.json();

      // Refetch actions to get the persisted database entry with its real ID
      const { data: actionsData, error: refetchErr } = await supabase
        .from('agent_actions')
        .select('id, agent_type, input_message, output_draft, requires_approval, status, created_at')
        .eq('founder_id', FOUNDER_ID)
        .order('created_at', { ascending: false });

      if (!refetchErr && actionsData) {
        const mapped: ActionCard[] = actionsData.map((row) => ({
          id: row.id,
          agentUsed: row.agent_type as any,
          inputMessage: row.input_message,
          draft: (row.output_draft as { text?: string })?.text ?? '',
          requiresApproval: row.requires_approval,
          status: row.status,
          createdAt: row.created_at,
        }));
        setActions(mapped);
      } else {
        // Fallback local state update in case refetch fails
        const newCard: ActionCard = {
          id: Math.random().toString(),
          agentUsed: data.agentUsed,
          inputMessage: userMessage,
          draft: data.draft,
          requiresApproval: data.requiresApproval,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        setActions((prev) => [newCard, ...prev]);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while calling the assistant.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Action Update (Approve / Reject)
  const handleUpdateStatus = async (id: string, nextStatus: 'approved' | 'rejected') => {
    try {
      const { error: updateErr } = await supabase
        .from('agent_actions')
        .update({ status: nextStatus, approved: nextStatus === 'approved' })
        .eq('id', id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      // Update local state representation
      setActions((prev) =>
        prev.map((card) => (card.id === id ? { ...card, status: nextStatus } : card))
      );
    } catch (err: any) {
      alert(`Action update failed: ${err.message}`);
    }
  };

  // Badge stylings
  const badgeClasses: Record<string, string> = {
    hiring: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    finance: 'bg-green-500/10 text-green-400 border border-green-500/20',
    legal: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    gtm: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-950 font-sans text-neutral-100 antialiased selection:bg-neutral-800 selection:text-neutral-200">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-950/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 font-bold text-neutral-950">
            Δ
          </div>
          <span className="text-lg font-semibold tracking-tight text-neutral-50">Delta</span>
        </div>
        {profile ? (
          <div className="text-right">
            <div className="text-sm font-medium text-neutral-300">{profile.name}</div>
            <div className="text-xs text-neutral-500">{profile.startup_name}</div>
          </div>
        ) : (
          <div className="h-9 w-24 animate-pulse rounded bg-neutral-900" />
        )}
      </header>

      {/* Main Workspace Feed */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl space-y-6 pb-24">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Loading Indicator Card */}
          {loading && (
            <div className="animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700 animate-pulse">
                  System
                </span>
                <span className="text-xs text-neutral-500">Just now</span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-neutral-300 flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Thinking...
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Evaluating instruction and dispatching corresponding agent...
              </p>
            </div>
          )}

          {/* Actions List Feed */}
          {actions.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl">👋</div>
              <h2 className="mt-4 text-lg font-semibold text-neutral-200">Welcome to Founder OS</h2>
              <p className="mt-2 max-w-sm text-sm text-neutral-500">
                Ask anything about hiring, legal documents, GTM strategies, or financial metrics below.
              </p>
            </div>
          ) : (
            actions.map((card) => (
              <div
                key={card.id}
                className="group relative rounded-xl border border-neutral-800 bg-neutral-900/20 p-6 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900/30 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                      badgeClasses[card.agentUsed] || 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {card.agentUsed}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Date(card.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="mt-2 text-xs italic text-neutral-500">
                  Prompt: "{card.inputMessage}"
                </div>

                <h3 className="mt-3 text-base font-semibold text-neutral-100">
                  {card.draft ? card.draft.split('\n')[0].replace(/^#+\s*/, '') : 'Draft Document'}
                </h3>

                <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-300">
                  {card.draft}
                </div>

                {/* Conditional Actions/Status Block */}
                {card.requiresApproval && (
                  <div className="mt-5 border-t border-neutral-800/60 pt-4 flex items-center justify-between">
                    {card.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(card.id, 'approved')}
                          className="rounded-lg bg-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(card.id, 'rejected')}
                          className="rounded-lg border border-neutral-800 bg-transparent px-3.5 py-1.5 text-xs font-semibold text-neutral-400 transition hover:border-neutral-700 hover:bg-neutral-900/40"
                        >
                          Reject
                        </button>
                      </div>
                    ) : card.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400 border border-green-500/20">
                        ✓ Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-500/20">
                        ✗ Rejected
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Sticky Bottom Chat Input Bar */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950/80 p-4 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask your startup helper anything..."
            disabled={loading}
            className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!message.trim() || loading}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}

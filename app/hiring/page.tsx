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
  status: string;
  createdAt: string;
};

export default function HiringPage() {
  const [actions, setActions] = useState<ActionCard[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchHiringActions = async () => {
    const { data, error } = await supabase
      .from('agent_actions')
      .select('id, agent_type, input_message, output_draft, requires_approval, status, created_at')
      .eq('founder_id', FOUNDER_ID)
      .eq('agent_type', 'hiring')
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
      setActions(mapped);
    }
  };

  useEffect(() => {
    fetchHiringActions();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [actions, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);
    setError(null);

    try {
      // Fetch profile to send complete info
      const { data: profile } = await supabase
        .from('founder_profile')
        .select('*')
        .eq('id', FOUNDER_ID)
        .single();

      const res = await fetch('/api/agent/hiring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founderId: FOUNDER_ID,
          message: userMessage,
          extractedContext: userMessage,
          founderProfile: profile || {},
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent request failed: ${res.status}`);
      }

      await fetchHiringActions();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('agent_actions')
        .update({ status: nextStatus, approved: nextStatus === 'approved' })
        .eq('id', id);

      if (!error) {
        setActions((prev) =>
          prev.map((card) => (card.id === id ? { ...card, status: nextStatus } : card))
        );
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-8 py-4 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight text-neutral-50">Hiring Agent</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Build descriptions, outline roles, and screen candidate drafts</p>
      </header>

      {/* Feed Container */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl space-y-6 pb-28">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading && (
            <div className="animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700 animate-pulse">
                  Hiring Specialist
                </span>
                <span className="text-xs text-neutral-500">Just now</span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-neutral-300 flex items-center gap-2">
                Thinking...
              </h3>
            </div>
          )}

          {actions.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-neutral-500">
              <p className="text-sm">No hiring agent actions yet. Ask to create a job description below.</p>
            </div>
          ) : (
            actions.map((card) => (
              <div
                key={card.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900/20 p-6 transition hover:border-neutral-700 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Hiring
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Date(card.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="mt-2 text-xs italic text-neutral-500">Prompt: "{card.inputMessage}"</div>
                <h3 className="mt-3 text-sm font-semibold text-neutral-200">
                  {card.draft ? card.draft.split('\n')[0].replace(/^#+\s*/, '') : 'Draft'}
                </h3>
                <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-300">
                  {card.draft}
                </div>

                {card.requiresApproval && (
                  <div className="mt-5 border-t border-neutral-800/65 pt-4 flex items-center justify-between">
                    {card.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(card.id, 'approved')}
                          className="rounded-lg bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(card.id, 'rejected')}
                          className="rounded-lg border border-neutral-800 bg-transparent px-3 py-1 text-xs font-semibold text-neutral-400 hover:bg-neutral-900/40"
                        >
                          Reject
                        </button>
                      </div>
                    ) : card.status === 'approved' ? (
                      <span className="inline-flex items-center rounded bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400 border border-green-500/20">
                        ✓ Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-500/20">
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

      {/* Footer Chat Input */}
      <footer className="fixed bottom-0 left-64 right-0 border-t border-neutral-800 bg-neutral-950/80 p-4 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell hiring agent what role to draft..."
            disabled={loading}
            className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-neutral-700 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!message.trim() || loading}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}

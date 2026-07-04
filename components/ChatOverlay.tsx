'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
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

export default function ChatOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ActionCard | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: FOUNDER_ID, message: userMessage }),
      });

      if (!res.ok) {
        throw new Error(`Orchestration failed: ${res.status}`);
      }

      const data = await res.json();
      setResponse({
        id: Math.random().toString(),
        agentUsed: data.agentUsed,
        inputMessage: userMessage,
        draft: data.draft,
        requiresApproval: data.requiresApproval,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: 'approved' | 'rejected') => {
    if (!response) return;
    try {
      const { error } = await supabase
        .from('agent_actions')
        .update({ status: nextStatus, approved: nextStatus === 'approved' })
        .eq('input_message', response.inputMessage)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error) {
        setResponse((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const badgeClasses: Record<string, string> = {
    hiring: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    finance: 'bg-green-500/10 text-green-400 border border-green-500/20',
    legal: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    gtm: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-950 shadow-2xl transition-all duration-200 hover:scale-105 hover:bg-neutral-200 focus:outline-none"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Slide-in panel - side drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative flex h-full w-96 flex-col border-l border-neutral-800 bg-neutral-950 p-6 shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-neutral-50">Global Assistant</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Orchestrate tasks across all agents</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Response area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-20">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
                  {error}
                </div>
              )}

              {loading && (
                <div className="animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 shadow-sm">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-400 animate-pulse">
                    Orchestrator
                  </span>
                  <h4 className="mt-2 text-sm font-semibold text-neutral-300">Thinking...</h4>
                </div>
              )}

              {response && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/20 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                        badgeClasses[response.agentUsed]
                      }`}
                    >
                      {response.agentUsed}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-neutral-500">Just now</span>
                      {response.requiresApproval && response.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleUpdateStatus(response.id, 'approved')}
                            className="rounded bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-950 hover:bg-neutral-200 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(response.id, 'rejected')}
                            className="rounded border border-neutral-800 bg-transparent px-2 py-0.5 text-[9px] font-medium text-neutral-400 hover:bg-neutral-900 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {response.requiresApproval && response.status === 'approved' && (
                        <span className="text-[9px] font-semibold text-green-400">✓ Approved</span>
                      )}
                      {response.requiresApproval && response.status === 'rejected' && (
                        <span className="text-[9px] font-semibold text-red-400">✗ Rejected</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] italic text-neutral-500">Prompt: "{response.inputMessage}"</div>
                  <h4 className="text-xs font-bold text-neutral-200 leading-snug">
                    {response.draft ? response.draft.split('\n')[0].replace(/^#+\s*/, '') : 'Draft'}
                  </h4>
                  <p className="text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
                    {response.draft}
                  </p>
                </div>
              )}

              {!loading && !response && (
                <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500">
                  <p className="text-xs">Send a message to let the router classify and invoke the correct agent.</p>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSubmit} className="absolute bottom-6 left-6 right-6 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask router to delegate action..."
                disabled={loading}
                className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-neutral-700 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!message.trim() || loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-950 transition hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

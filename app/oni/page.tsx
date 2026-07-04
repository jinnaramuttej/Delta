'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Sparkles } from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

type Message = {
  id: string;
  sender: 'user' | 'oni';
  text: string;
  agentUsed?: 'hiring' | 'finance' | 'legal' | 'gtm';
  requiresApproval?: boolean;
  status?: string;
};

export default function OniPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const badgeClasses: Record<string, string> = {
    hiring: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    finance: 'bg-green-500/10 text-green-400 border border-green-500/20',
    legal: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    gtm: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setHasStarted(true);

    const userMsgId = Math.random().toString();
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: FOUNDER_ID, message: userText }),
      });

      if (!res.ok) {
        throw new Error('Orchestration query failed');
      }

      const data = await res.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: data.id || Math.random().toString(),
          sender: 'oni',
          text: data.draft || data.summary || 'Task completed by Agent.',
          agentUsed: data.agentUsed,
          requiresApproval: data.requiresApproval,
          status: data.status || 'pending',
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), sender: 'oni', text: 'Sorry, I encountered an error coordinating with the orchestrator.' },
      ]);
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
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
        );
      }
    } catch (err: any) {
      alert(`Action update failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden relative">
      {/* Messages Scroll Area */}
      {hasStarted ? (
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6 pb-28">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'user' ? (
                  <div className="bg-neutral-800 text-neutral-150 rounded-xl px-4.5 py-2.5 max-w-lg text-sm leading-relaxed">
                    {msg.text}
                  </div>
                ) : (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-2xl w-full space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                      <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-neutral-400" /> Oni
                      </span>
                      {msg.agentUsed && (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badgeClasses[msg.agentUsed]}`}>
                          {msg.agentUsed}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-neutral-305 whitespace-pre-line leading-relaxed">
                      {msg.text}
                    </p>

                    {msg.requiresApproval && (
                      <div className="flex gap-2 pt-2 border-t border-neutral-850">
                        {msg.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(msg.id, 'approved')}
                              className="rounded bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(msg.id, 'rejected')}
                              className="rounded border border-neutral-850 bg-transparent px-3.5 py-1 text-xs font-medium text-neutral-400 hover:bg-neutral-900 transition"
                            >
                              Reject
                            </button>
                          </>
                        ) : msg.status === 'approved' ? (
                          <span className="text-xs font-semibold text-green-400">✓ Approved</span>
                        ) : (
                          <span className="text-xs font-semibold text-red-400">✗ Rejected</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-400 animate-pulse">Thinking</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        // Empty State: Centered Content
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="max-w-md w-full text-center space-y-4 mb-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-50 flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-neutral-400" /> Oni
            </h1>
            <p className="text-sm text-neutral-400">
              Your startup orchestrator agent. Ask me to hire, draft policies, review runway, or generate gtm copies from here.
            </p>
          </div>
        </div>
      )}

      {/* Input form - Center on empty, bottom on start */}
      <div className={`w-full max-w-3xl mx-auto px-8 transition-all duration-300 ease-out ${
        hasStarted ? 'absolute bottom-6 left-0 right-0 z-20' : 'mb-36'
      }`}>
        <form onSubmit={handleSubmit} className="flex gap-2 bg-neutral-900/60 p-2.5 rounded-2xl border border-neutral-800 shadow-2xl backdrop-blur-md">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Oni to delegate orchestrations..."
            disabled={loading}
            className="flex-1 rounded-xl bg-transparent px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-950 transition hover:bg-neutral-200 disabled:bg-neutral-850 disabled:text-neutral-600"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

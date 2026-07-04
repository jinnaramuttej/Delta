'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Sparkles, Paperclip, Mic, ArrowUp, ImageIcon } from 'lucide-react';

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
  const [founderName, setFounderName] = useState('');
  const [greeting, setGreeting] = useState('Hello');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const badgeClasses: Record<string, string> = {
    hiring: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    finance: 'bg-green-500/10 text-green-400 border border-green-500/20',
    legal: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    gtm: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  };

  useEffect(() => {
    // 1. Fetch founder profile name
    async function fetchFounder() {
      const { data, error } = await supabase
        .from('founder_profile')
        .select('name')
        .eq('id', FOUNDER_ID)
        .single();
      if (!error && data) {
        setFounderName(data.name);
      }
    }
    fetchFounder();

    // 2. Compute greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    setInput('');
    setHasStarted(true);

    const userMsgId = Math.random().toString();
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: queryText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: FOUNDER_ID, message: queryText }),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(input);
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
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.sender === 'user' ? (
                  <div className="bg-neutral-100 text-neutral-900 rounded-2xl px-5 py-2.5 max-w-lg text-sm font-medium leading-relaxed shadow-sm">
                    {msg.text}
                  </div>
                ) : (
                  <div className="w-full max-w-2xl space-y-2">
                    {/* Oni avatar & label */}
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-neutral-800 border border-neutral-750 flex items-center justify-center text-[10px] font-bold text-neutral-350">
                        O
                      </div>
                      <span className="text-[10px] font-extrabold tracking-wider text-neutral-400">ONI</span>
                    </div>

                    {/* Oni Response Bubble */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                        <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-neutral-400" /> Assistant Response
                        </span>
                        {msg.agentUsed && (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badgeClasses[msg.agentUsed]}`}>
                            {msg.agentUsed}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">
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
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-neutral-800 border border-neutral-750 flex items-center justify-center text-[10px] font-bold text-neutral-350">
                    O
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-neutral-400">ONI</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-400 animate-pulse">Thinking</span>
                  <span className="flex gap-1.5">
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
        // Empty State: Centered Greeting and Input layout
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="max-w-xl w-full text-center space-y-6 mb-24">
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-50">
              {greeting}, <span className="font-light text-neutral-400">{founderName || 'Founder'}</span>
            </h1>
            
            {/* Input Row */}
            <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-4.5 shadow-2xl focus-within:border-neutral-700 transition">
              <button type="button" className="text-neutral-500 hover:text-neutral-350 transition">
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="How can I help you today?"
                className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
              />
              <div className="flex items-center gap-3">
                <button type="button" className="text-neutral-500 hover:text-neutral-300 transition">
                  <Sparkles className="h-5 w-5" />
                </button>
                <button type="button" className="text-neutral-500 hover:text-neutral-300 transition">
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-neutral-100 hover:bg-neutral-600 transition disabled:opacity-40"
                >
                  <ArrowUp className="h-4.5 w-4.5" />
                </button>
              </div>
            </form>

            {/* Templates Quick pills section */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Templates</div>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handleQuery('Check my runway & active snapshots')}
                  className="rounded-full border border-neutral-800 bg-neutral-900/50 px-4 py-1.5 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                >
                  Check my runway
                </button>
                <button
                  onClick={() => handleQuery('Draft an NDA for hiring developer')}
                  className="rounded-full border border-neutral-800 bg-neutral-900/50 px-4 py-1.5 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                >
                  Draft an NDA
                </button>
                <button
                  onClick={() => handleQuery('Write a GTM launch post for LinkedIn')}
                  className="rounded-full border border-neutral-800 bg-neutral-900/50 px-4 py-1.5 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                >
                  Write a launch post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom bar input - displayed only once chat has started */}
      {hasStarted && (
        <div className="absolute bottom-6 left-0 right-0 z-20 w-full max-w-3xl mx-auto px-8 transition-all duration-300 ease-out">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-4.5 shadow-2xl backdrop-blur-md">
            <button type="button" className="text-neutral-500 hover:text-neutral-305 transition">
              <Paperclip className="h-5 w-5" />
            </button>
            <button type="button" className="text-neutral-500 hover:text-neutral-305 transition">
              <ImageIcon className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a message..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none disabled:opacity-50"
            />
            <div className="flex items-center gap-3">
              <button type="button" className="text-neutral-500 hover:text-neutral-305 transition">
                <Mic className="h-5 w-5" />
              </button>
              <button type="button" className="text-neutral-500 hover:text-neutral-305 transition">
                <Sparkles className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-neutral-100 hover:bg-neutral-600 transition disabled:opacity-40"
              >
                <ArrowUp className="h-4.5 w-4.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

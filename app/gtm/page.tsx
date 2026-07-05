'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Megaphone, FileText, Check, X, ChevronDown, ChevronUp,
  Sparkles, RefreshCw, Send, Camera, Bird, Link2,
  MessageSquare, Globe, Target, Zap, BarChart2, Share2
} from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

const CONTENT_TYPES = [
  {
    id: 'Social Caption',
    name: 'Social Caption',
    icon: MessageSquare,
    desc: 'Short punchy caption for Instagram, Twitter, or LinkedIn with a CTA.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20 hover:border-purple-400/40',
    activeBg: 'bg-purple-500/20 border-purple-400/50',
  },
  {
    id: 'Launch Post',
    name: 'Launch Post',
    icon: Zap,
    desc: 'Full product launch announcement post with storytelling and momentum.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-400/40',
    activeBg: 'bg-blue-500/20 border-blue-400/50',
  },
  {
    id: 'Landing Page Copy',
    name: 'Landing Page Copy',
    icon: Globe,
    desc: 'Headline, subheadline, 3 benefit bullets, and a conversion-focused CTA.',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20 hover:border-green-400/40',
    activeBg: 'bg-green-500/20 border-green-400/50',
  },
  {
    id: 'Positioning Statement',
    name: 'Positioning Statement',
    icon: Target,
    desc: 'Strategic positioning in "For [target], [product] is the [category] that..." format.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-400/40',
    activeBg: 'bg-amber-500/20 border-amber-400/50',
  },
];

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Camera },
  { id: 'twitter',   label: 'X / Twitter', icon: Bird },
  { id: 'linkedin',  label: 'LinkedIn', icon: Link2 },
];

type ActionCard = {
  id: string;
  inputMessage: string;
  draft: string;
  requiresApproval: boolean;
  status: string;
  createdAt: string;
};

export default function GTMPage() {
  const [actions, setActions]               = useState<ActionCard[]>([]);
  const [message, setMessage]               = useState('');
  const [selectedType, setSelectedType]     = useState('');
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [fetchLoading, setFetchLoading]     = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [founderProfile, setFounderProfile] = useState<any>(null);
  const [toast, setToast]                   = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const statusColors: Record<string, string> = {
    pending:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    approved: 'bg-green-500/10 text-green-400 border border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
    posted:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };

  const fetchActions = async () => {
    const { data, error } = await supabase
      .from('agent_actions')
      .select('id, agent_type, input_message, output_draft, requires_approval, status, created_at')
      .eq('founder_id', FOUNDER_ID)
      .eq('agent_type', 'gtm')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActions(data.map((row) => ({
        id: row.id,
        inputMessage: row.input_message,
        draft: (row.output_draft as { text?: string })?.text ?? '',
        requiresApproval: row.requires_approval,
        status: row.status,
        createdAt: row.created_at,
      })));
    }
    setFetchLoading(false);
  };

  useEffect(() => {
    fetchActions();
    supabase
      .from('founder_profile')
      .select('*')
      .eq('id', FOUNDER_ID)
      .single()
      .then(({ data }) => { if (data) setFounderProfile(data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedType) return;

    const finalMessage = selectedType
      ? `Write a ${selectedType}. ${message}`.trim()
      : message;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agent/gtm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founderId: FOUNDER_ID,
          message: finalMessage,
          extractedContext: selectedType || finalMessage,
          founderProfile,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'GTM agent request failed');
      }

      setMessage('');
      setSelectedType('');
      showToast('✅ Marketing copy drafted!');
      await fetchActions();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('agent_actions')
      .update({ status: nextStatus, approved: nextStatus === 'approved' })
      .eq('id', id);

    if (!error) {
      await fetchActions();
      showToast(nextStatus === 'approved' ? '✅ Draft approved!' : '❌ Draft rejected.');
    }
  };

  const handleSimulatedPost = async (id: string, platform: string) => {
    const { error } = await supabase
      .from('agent_actions')
      .update({ status: 'posted' })
      .eq('id', id);

    if (!error) {
      await fetchActions();
      showToast(`✅ Posted to ${platform} (simulated)`);
    }
  };

  // ─── Derived stats ─────────────────────────────────────────────
  const total    = actions.length;
  const pending  = actions.filter(a => a.status === 'pending').length;
  const approved = actions.filter(a => a.status === 'approved').length;
  const rejected = actions.filter(a => a.status === 'rejected').length;
  const posted   = actions.filter(a => a.status === 'posted').length;

  const pendingApproval = actions.filter(a => a.status === 'pending' && a.requiresApproval);
  const history         = actions;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-50 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-neutral-400" /> GTM & Marketing
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5 font-medium">AI-drafted marketing copy, launch posts, and growth content.</p>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">

        {/* ─── Stats Strip ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total Drafts', value: total,    color: 'text-neutral-200' },
            { label: 'Pending',      value: pending,  color: 'text-amber-400' },
            { label: 'Approved',     value: approved, color: 'text-green-400' },
            { label: 'Rejected',     value: rejected, color: 'text-red-400' },
            { label: 'Posted',       value: posted,   color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-4 space-y-1">
              <p className={`text-2xl font-bold ${color}`}>{fetchLoading ? '–' : value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ─── Content Type Selector ─────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Content Type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CONTENT_TYPES.map((ct) => {
              const Icon     = ct.icon;
              const isActive = selectedType === ct.id;
              return (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => setSelectedType(isActive ? '' : ct.id)}
                  className={`rounded-xl border p-4 text-left transition-all duration-150 space-y-2 ${isActive ? ct.activeBg : ct.bg}`}
                >
                  <Icon className={`h-5 w-5 ${ct.color}`} />
                  <p className={`text-xs font-bold ${ct.color}`}>{ct.name}</p>
                  <p className="text-[10px] text-neutral-500 leading-relaxed">{ct.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── Query Input ───────────────────────────────────────── */}
        <section className="rounded-xl border border-neutral-850 bg-neutral-900/10 p-5 space-y-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Ask AI</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              {selectedType
                ? `Generating: ${selectedType}. Add extra context below, or just hit Ask AI.`
                : 'Describe what marketing copy you need, or select a type above.'}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={
                selectedType === 'Social Caption'        ? 'e.g. announcing our beta launch on Product Hunt…' :
                selectedType === 'Launch Post'           ? 'e.g. we just crossed 100 users and launched our free tier…' :
                selectedType === 'Landing Page Copy'     ? 'e.g. our product helps solo founders automate their legal work…' :
                selectedType === 'Positioning Statement' ? 'e.g. targeting early-stage SaaS founders who hate legal paperwork…' :
                'e.g. write a LinkedIn post about our Series A announcement…'
              }
              rows={3}
              className="w-full rounded-xl border border-neutral-850 bg-neutral-900/40 px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:border-neutral-700 focus:outline-none transition resize-none"
            />
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <X className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || (!message.trim() && !selectedType)}
                className="flex items-center gap-2 rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Drafting marketing copy with AI…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Ask AI
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ─── Approval Queue (only requiresApproval=true items) ── */}
        {pendingApproval.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              Approval Queue
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">
                {pendingApproval.length}
              </span>
            </h2>
            <div className="space-y-3">
              {pendingApproval.map(card => (
                <div key={card.id} className="rounded-xl border border-amber-500/20 bg-neutral-900/10 p-4 space-y-3 hover:border-amber-500/30 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-200 truncate">
                        {card.draft.split('\n')[0].replace(/^#+\s*/, '') || 'GTM Draft'}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5 truncate">Prompt: "{card.inputMessage}"</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold capitalize border shrink-0 ${statusColors[card.status] ?? 'bg-neutral-800 text-neutral-400'}`}>
                      {card.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-3 leading-relaxed whitespace-pre-line">{card.draft}</p>
                  <div className="flex gap-2 pt-2 border-t border-neutral-800/80">
                    <button onClick={() => handleUpdateStatus(card.id, 'approved')} className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition">
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => handleUpdateStatus(card.id, 'rejected')} className="flex items-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-900/40 transition">
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── All Drafts History ────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-200">All Drafts</h2>
          {fetchLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-neutral-900" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-8 text-center space-y-2">
              <Megaphone className="h-8 w-8 text-neutral-700 mx-auto" />
              <p className="text-sm text-neutral-500">No GTM drafts yet.</p>
              <p className="text-xs text-neutral-600">Select a content type above and ask the AI to generate your first piece.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 divide-y divide-neutral-800 overflow-hidden">
              {history.map(card => {
                const isExpanded = expandedId === card.id;
                const title      = card.draft.split('\n')[0].replace(/^#+\s*/, '').slice(0, 90) || 'Marketing Draft';
                return (
                  <div key={card.id} className="transition duration-150 hover:bg-neutral-900/20">
                    {/* Row header */}
                    <div
                      className="flex items-center gap-3 px-5 py-3.5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : card.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-neutral-200 truncate">{title}</p>
                          <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0 ${statusColors[card.status] ?? 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}>
                            {card.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
                          Prompt: "{card.inputMessage}"
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-neutral-600">
                          {new Date(card.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4 animate-in fade-in duration-150">
                        {/* Full draft */}
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                            <FileText className="h-3 w-3" /> Draft Content
                          </p>
                          <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{card.draft}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Approval buttons (only if requiresApproval=true) */}
                          {card.requiresApproval && card.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(card.id, 'approved')}
                                className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(card.id, 'rejected')}
                                className="flex items-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-900/40 transition"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                              <span className="text-neutral-700 text-xs">|</span>
                            </>
                          )}

                          {/* Simulated post buttons */}
                          {card.status !== 'rejected' && (
                            <>
                              <p className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider mr-1">Post (simulated):</p>
                              {PLATFORMS.map(platform => {
                                const PlatIcon = platform.icon;
                                return (
                                  <button
                                    key={platform.id}
                                    onClick={() => handleSimulatedPost(card.id, platform.label)}
                                    className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/30 px-3 py-1.5 text-[10px] font-semibold text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 transition"
                                  >
                                    <PlatIcon className="h-3.5 w-3.5" />
                                    {platform.label}
                                  </button>
                                );
                              })}
                            </>
                          )}

                          {card.status === 'posted' && (
                            <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                              <Share2 className="h-3 w-3" /> Posted (simulated)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
